import logging

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.core.config import settings as app_settings
from app.main import create_app


def test_environment_defaults_to_development(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    loaded = Settings(_env_file=None)
    assert loaded.environment == "development"
    assert loaded.cors_origin_list == ["http://localhost:3000"]
    assert loaded.log_level == logging.DEBUG


def test_cors_origins_parsed_from_comma_separated_string() -> None:
    loaded = Settings(
        _env_file=None,
        cors_origins="https://app.example.com, https://admin.example.com",
    )
    assert loaded.cors_origin_list == [
        "https://app.example.com",
        "https://admin.example.com",
    ]


def test_wildcard_cors_rejected_outside_development() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, environment="production", cors_origins="*")


def test_docs_enabled_outside_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(app_settings, "environment", "staging")
    client = TestClient(create_app())
    assert client.get("/docs").status_code == 200
    assert client.get("/redoc").status_code == 200


def test_docs_disabled_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(app_settings, "environment", "production")
    client = TestClient(create_app())
    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
