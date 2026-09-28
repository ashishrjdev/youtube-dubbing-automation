import pytest
from fastapi.testclient import TestClient
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.core.config import settings as app_settings
from app.core.security import SECURITY_HEADERS, InsecureProductionConfig
from app.main import create_app


def test_development_has_no_security_headers_or_redirect(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(app_settings, "environment", "development")
    client = TestClient(create_app(), base_url="http://testserver")

    response = client.get("/health", follow_redirects=False)
    assert response.status_code == 200
    for key in SECURITY_HEADERS:
        assert key not in response.headers
    assert client.get("/me", follow_redirects=False).status_code == 401


@pytest.mark.usefixtures("production_settings")
@pytest.mark.parametrize(("path", "expected"), [("/health", 200), ("/me", 401), ("/nope", 404)])
def test_production_sets_security_headers(path: str, expected: int) -> None:
    client = TestClient(create_app(), base_url="https://testserver")

    response = client.get(path)

    assert response.status_code == expected
    for key, value in SECURITY_HEADERS.items():
        assert response.headers[key] == value


@pytest.mark.usefixtures("production_settings")
def test_production_redirects_plain_http_to_https() -> None:
    client = TestClient(create_app(), base_url="http://testserver")

    response = client.get("/projects?x=1", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "https://testserver/projects?x=1"
    assert response.headers["strict-transport-security"]


@pytest.mark.usefixtures("production_settings")
def test_health_check_is_not_redirected() -> None:
    client = TestClient(create_app(), base_url="http://testserver")

    assert client.get("/health", follow_redirects=False).status_code == 200


@pytest.mark.usefixtures("production_settings")
def test_no_redirect_loop_behind_trusted_tls_proxy() -> None:
    app = ProxyHeadersMiddleware(create_app(), trusted_hosts="*")
    client = TestClient(app, base_url="http://testserver")

    response = client.get(
        "/me", headers={"X-Forwarded-Proto": "https"}, follow_redirects=False
    )

    assert response.status_code == 401


@pytest.mark.usefixtures("production_settings")
def test_untrusted_proxy_header_is_ignored() -> None:
    """What happens without FORWARDED_ALLOW_IPS: TLS-terminated requests look like http."""
    app = ProxyHeadersMiddleware(create_app(), trusted_hosts="127.0.0.1")
    client = TestClient(app, base_url="http://testserver")

    response = client.get(
        "/me", headers={"X-Forwarded-Proto": "https"}, follow_redirects=False
    )

    assert response.status_code == 307


@pytest.mark.usefixtures("production_settings")
@pytest.mark.parametrize(
    "origins",
    [
        "http://app.example.com",
        "https://app.example.com,http://localhost:3000",
        "HTTP://app.example.com",
    ],
)
def test_production_refuses_http_cors_origins(
    monkeypatch: pytest.MonkeyPatch, origins: str
) -> None:
    monkeypatch.setattr(app_settings, "cors_origins", origins)

    with pytest.raises(InsecureProductionConfig, match="CORS_ORIGINS"):
        create_app()


@pytest.mark.usefixtures("production_settings")
def test_production_requires_forwarded_allow_ips(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(app_settings, "forwarded_allow_ips", "  ")

    with pytest.raises(InsecureProductionConfig, match="FORWARDED_ALLOW_IPS"):
        create_app()


@pytest.mark.parametrize("environment", ["development", "staging"])
def test_http_cors_allowed_outside_production(
    monkeypatch: pytest.MonkeyPatch, environment: str
) -> None:
    monkeypatch.setattr(app_settings, "environment", environment)
    monkeypatch.setattr(app_settings, "cors_origins", "http://localhost:3000")
    monkeypatch.setattr(app_settings, "forwarded_allow_ips", "")

    create_app()
