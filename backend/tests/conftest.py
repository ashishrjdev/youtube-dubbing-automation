import pytest

from app.core.config import settings as app_settings


@pytest.fixture
def production_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """A production config that passes the API's HTTPS startup checks."""
    monkeypatch.setattr(app_settings, "environment", "production")
    monkeypatch.setattr(app_settings, "cors_origins", "https://app.example.com")
    monkeypatch.setattr(app_settings, "forwarded_allow_ips", "*")
