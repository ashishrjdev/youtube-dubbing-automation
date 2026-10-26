import pytest
from fastapi.testclient import TestClient

from app.core.config import settings as app_settings
from app.core.errors import REQUEST_ID_HEADER
from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(), raise_server_exceptions=False)


def test_unknown_route_uses_standard_404_shape(client: TestClient) -> None:
    response = client.get("/no/such/route")

    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "not_found"
    assert body["request_id"]
    assert "detail" not in body
    assert response.headers.get(REQUEST_ID_HEADER) == body["request_id"]


def test_http_exception_uses_standard_shape(client: TestClient) -> None:
    response = client.get("/me")

    assert response.status_code == 401
    body = response.json()
    assert body["error"] == "unauthorized"
    assert body["message"] == "Not authenticated"
    assert body["request_id"]
    assert "detail" not in body


def test_unhandled_exception_hides_internals(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(app_settings, "environment", "development")
    # Re-create so /debug/raise is mounted under development.
    app_client = TestClient(create_app(), raise_server_exceptions=False)

    response = app_client.get(
        "/debug/raise", headers={REQUEST_ID_HEADER: "verify-request-id"}
    )

    assert response.status_code == 500
    body = response.json()
    assert body == {"error": "internal_error", "request_id": "verify-request-id"}
    assert "RuntimeError" not in response.text
    assert "/app/" not in response.text
    # configure_logging() writes to stdout, so the traceback shows up there.
    logs = capsys.readouterr().out
    assert "verify-request-id" in logs
    assert "Intentional debug failure" in logs


def test_docs_disabled_in_production(production_settings: None) -> None:
    client = TestClient(create_app(), base_url="https://testserver")
    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
