from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "environment": settings.environment}


def test_projects_requires_auth() -> None:
    response = client.get("/projects")
    assert response.status_code == 401


def test_script_lines_requires_auth() -> None:
    response = client.get("/projects/00000000-0000-0000-0000-000000000001/script-lines")
    assert response.status_code == 401


def test_speakers_requires_auth() -> None:
    response = client.get("/projects/00000000-0000-0000-0000-000000000001/speakers")
    assert response.status_code == 401


def test_generations_requires_auth() -> None:
    response = client.get("/projects/00000000-0000-0000-0000-000000000001/generations")
    assert response.status_code == 401
