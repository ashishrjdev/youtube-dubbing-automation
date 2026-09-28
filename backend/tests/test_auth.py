import re
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient
from supabase_auth.errors import AuthApiError, AuthRetryableError

from app.core import auth
from app.core.config import settings as app_settings
from app.main import create_app

PUBLIC_PATHS = {"/health"}
FAKE_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl"


class FakeAuth:
    def __init__(self, result=None, error: Exception | None = None) -> None:
        self.result = result
        self.error = error
        self.calls: list[str] = []

    def get_user(self, jwt: str):
        self.calls.append(jwt)
        if self.error:
            raise self.error
        return self.result


@pytest.fixture
def fake_auth(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(app_settings, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(app_settings, "supabase_anon_key", "anon")

    def install(**kwargs) -> FakeAuth:
        fake = FakeAuth(**kwargs)
        monkeypatch.setattr(
            auth, "get_supabase_client", lambda: SimpleNamespace(auth=fake)
        )
        return fake

    return install


@pytest.mark.parametrize("environment", ["development", "production"])
def test_every_non_public_route_requires_auth(
    request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch, environment: str
) -> None:
    if environment == "production":
        request.getfixturevalue("production_settings")
    else:
        monkeypatch.setattr(app_settings, "environment", environment)
    app = create_app()
    client = TestClient(app, base_url="https://testserver")
    checked = 0

    for route_path, operations in app.openapi()["paths"].items():
        if route_path in PUBLIC_PATHS:
            continue
        if route_path.startswith("/debug"):
            assert environment == "development"
            continue
        path = re.sub(r"\{[^}]+\}", str(uuid4()), route_path)
        for method in operations:
            response = client.request(method.upper(), path)
            assert response.status_code == 401, (
                f"{method} {route_path} is not protected"
            )
            checked += 1

    assert checked >= 15


@pytest.mark.parametrize(
    "header",
    [
        None,
        "",
        "Bearer",
        "Bearer ",
        "Basic dXNlcjpwYXNz",
        "Token abc",
        "Bearer not-a-jwt",
        "Bearer a.b",
    ],
)
def test_missing_or_malformed_header_is_401_without_calling_supabase(
    fake_auth, header
) -> None:
    fake = fake_auth()
    headers = {} if header is None else {"Authorization": header}

    response = TestClient(create_app()).get("/me", headers=headers)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert fake.calls == []


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (AuthApiError("invalid JWT: signature is invalid", 403, "bad_jwt"), 401),
        (AuthApiError("token is expired", 403, "bad_jwt"), 401),
        (
            AuthApiError(
                "Session from session_id claim in JWT does not exist",
                403,
                "session_not_found",
            ),
            401,
        ),
        (AuthApiError("internal error", 500, "unexpected_failure"), 503),
        (AuthRetryableError("Bad gateway", 502), 503),
        (httpx.ConnectError("connection refused"), 503),
    ],
)
def test_supabase_errors_map_to_401_or_503(fake_auth, error, expected) -> None:
    fake_auth(error=error)

    response = TestClient(create_app()).get(
        "/me", headers={"Authorization": f"Bearer {FAKE_JWT}"}
    )

    assert response.status_code == expected


def test_valid_token_exposes_verified_user_id(fake_auth) -> None:
    user_id = uuid4()
    fake = fake_auth(
        result=SimpleNamespace(
            user=SimpleNamespace(id=str(user_id), email="a@example.com")
        )
    )

    response = TestClient(create_app()).get(
        "/me", headers={"Authorization": f"Bearer {FAKE_JWT}"}
    )

    assert response.status_code == 200
    assert response.json() == {"id": str(user_id), "email": "a@example.com"}
    assert fake.calls == [FAKE_JWT]
