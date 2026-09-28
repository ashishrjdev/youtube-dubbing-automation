import logging

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from app.core.config import settings as app_settings
from app.core.logging import configure_logging
from app.main import create_app

PASSWORD = "Canary-Pw-do-not-echo"


class LoginBody(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+$")
    password: str = Field(min_length=64)


def test_validation_errors_do_not_echo_submitted_values() -> None:
    app = create_app()

    @app.post("/_test/login")
    def login(body: LoginBody) -> dict[str, str]:
        return {"ok": "yes"}

    response = TestClient(app).post(
        "/_test/login", json={"email": "not-an-email", "password": PASSWORD}
    )

    assert response.status_code == 422
    assert PASSWORD not in response.text
    assert [e["loc"] for e in response.json()["details"]] == [
        ["body", "email"],
        ["body", "password"],
    ]


@pytest.mark.parametrize("name", ["hpack", "h2", "httpcore"])
def test_header_logging_libraries_silenced_in_development(
    monkeypatch: pytest.MonkeyPatch, name: str
) -> None:
    monkeypatch.setattr(app_settings, "environment", "development")
    configure_logging()

    assert logging.getLogger().level == logging.DEBUG
    assert not logging.getLogger(name).isEnabledFor(logging.DEBUG)
