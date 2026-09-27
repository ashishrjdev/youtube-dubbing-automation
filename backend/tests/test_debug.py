from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings as app_settings
from app.core.queue import get_queue
from app.main import create_app


class FakeQueue:
    def __init__(self) -> None:
        self.enqueued: list[str] = []
        self.connection = None

    def enqueue(self, func, *args, **kwargs):
        self.enqueued.append(func.__name__)
        return SimpleNamespace(id=f"job-{len(self.enqueued)}")


def _client_with_fake_queue(fake: FakeQueue) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_queue] = lambda: fake
    return TestClient(app)


def test_enqueues_three_stub_jobs(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(app_settings, "environment", "development")
    fake = FakeQueue()

    response = _client_with_fake_queue(fake).post("/debug/test-job")

    assert response.status_code == 200
    assert set(response.json()["jobs"]) == {"transcribe_job", "rewrite_job", "generate_audio_job"}
    assert fake.enqueued == ["transcribe_job", "rewrite_job", "generate_audio_job"]


def test_optional_failure_and_sleep_jobs(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(app_settings, "environment", "development")
    fake = FakeQueue()

    response = _client_with_fake_queue(fake).post(
        "/debug/test-job", params={"include_failure": True, "sleep_seconds": 5}
    )

    assert response.status_code == 200
    assert {"failing_job", "sleep_job"} <= set(response.json()["jobs"])


@pytest.mark.parametrize("environment", ["staging", "production"])
def test_debug_routes_absent_outside_development(
    monkeypatch: pytest.MonkeyPatch, environment: str
) -> None:
    monkeypatch.setattr(app_settings, "environment", environment)
    client = TestClient(create_app())

    assert client.post("/debug/test-job").status_code == 404
    assert client.get("/debug/test-job/some-id").status_code == 404
