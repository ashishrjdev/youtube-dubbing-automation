from datetime import UTC, datetime
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.queue import get_queue
from app.main import create_app
from app.models.project import Project, ProjectStatus, SourceType
from app.routers import projects as projects_router
from app.services.audio_upload import AudioUploadError, ProbedAudio

FAKE_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl"


class FakeQueue:
    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.enqueued: list[tuple] = []

    def enqueue(self, func, *args, **kwargs):
        if self.fail:
            raise RuntimeError("redis down")
        self.enqueued.append((func.__name__, args, kwargs))
        return SimpleNamespace(id="job-1")


class FakeQuery:
    def __init__(self, result):
        self._result = result

    def filter(self, *args, **kwargs):
        return self

    def one_or_none(self):
        return self._result


class FakeSession:
    def __init__(self) -> None:
        self.added: list[Project] = []
        self.deleted: list[Project] = []
        self.committed = 0

    def add(self, obj) -> None:
        self.added.append(obj)

    def delete(self, obj) -> None:
        self.deleted.append(obj)
        if obj in self.added:
            self.added.remove(obj)

    def commit(self) -> None:
        self.committed += 1

    def refresh(self, obj) -> None:
        if getattr(obj, "created_at", None) is None:
            obj.created_at = datetime.now(UTC)
        if getattr(obj, "updated_at", None) is None:
            obj.updated_at = obj.created_at

    def query(self, model):
        assert model is Project
        return FakeQuery(None)


def _verified_user(user_id=None):
    return SimpleNamespace(
        id=str(user_id or uuid4()),
        email="a@example.com",
        email_confirmed_at=datetime.now(UTC),
    )


def _unverified_user(user_id=None):
    return SimpleNamespace(
        id=str(user_id or uuid4()),
        email="a@example.com",
        email_confirmed_at=None,
    )


def _client(user, db: FakeSession, queue: FakeQueue) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_queue] = lambda: queue
    return TestClient(app)


def _mp3_files(name: str = "voice.mp3", data: bytes = b"ID3fake") -> dict:
    return {"file": (name, BytesIO(data), "application/octet-stream")}


@pytest.fixture
def upload_ok(monkeypatch: pytest.MonkeyPatch):
    uploaded: list[tuple] = []
    deleted: list[str] = []

    monkeypatch.setattr(
        projects_router,
        "probe_audio",
        lambda path: ProbedAudio(duration_seconds=12, has_audio=True),
    )
    monkeypatch.setattr(
        projects_router.storage,
        "upload_file",
        lambda path, file_bytes, content_type: uploaded.append((path, len(file_bytes), content_type))
        or path,
    )
    monkeypatch.setattr(
        projects_router.storage,
        "delete_file",
        lambda path: deleted.append(path),
    )
    return uploaded, deleted


def test_upload_success(upload_ok, monkeypatch: pytest.MonkeyPatch) -> None:
    uploaded, deleted = upload_ok
    user = _verified_user()
    db = FakeSession()
    queue = FakeQueue()

    response = _client(user, db, queue).post(
        "/projects/upload",
        files=_mp3_files("My Song.mp3"),
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["source_type"] == SourceType.upload.value
    assert body["title"] == "My Song"
    assert body["duration_seconds"] == 12
    assert body["status"] == ProjectStatus.transcribing.value
    assert body["source_ref"].endswith("/source.mp3")
    assert "My Song" not in body["source_ref"]
    assert uploaded and uploaded[0][0] == body["source_ref"]
    assert deleted == []
    assert queue.enqueued[0][0] == "transcribe_job"
    assert len(db.added) == 1


def test_upload_unverified_403() -> None:
    response = _client(_unverified_user(), FakeSession(), FakeQueue()).post(
        "/projects/upload",
        files=_mp3_files(),
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 403
    assert response.json()["error"] == "email_not_verified"


def test_upload_no_token_401() -> None:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: FakeSession()
    app.dependency_overrides[get_queue] = lambda: FakeQueue()
    response = TestClient(app).post("/projects/upload", files=_mp3_files())
    assert response.status_code == 401


def test_upload_storage_failure_no_project(
    upload_ok, monkeypatch: pytest.MonkeyPatch
) -> None:
    _uploaded, deleted = upload_ok

    def boom(path, file_bytes, content_type):
        raise projects_router.storage.StorageError("nope")

    monkeypatch.setattr(projects_router.storage, "upload_file", boom)
    db = FakeSession()
    response = _client(_verified_user(), db, FakeQueue()).post(
        "/projects/upload",
        files=_mp3_files(),
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 503
    assert response.json()["error"] == "storage_failed"
    assert db.added == []
    assert deleted == []


def test_upload_enqueue_failure_deletes_object_and_project(
    upload_ok, monkeypatch: pytest.MonkeyPatch
) -> None:
    uploaded, deleted = upload_ok
    db = FakeSession()
    response = _client(_verified_user(), db, FakeQueue(fail=True)).post(
        "/projects/upload",
        files=_mp3_files("clip.mp3"),
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 503
    assert response.json()["error"] == "queue_unavailable"
    assert uploaded
    assert deleted == [uploaded[0][0]]
    assert db.added == []
    assert len(db.deleted) == 1


def test_upload_rejects_bad_extension(upload_ok) -> None:
    response = _client(_verified_user(), FakeSession(), FakeQueue()).post(
        "/projects/upload",
        files={"file": ("notes.txt", BytesIO(b"hello"), "text/plain")},
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 415
    assert response.json()["error"] == "unsupported_file_type"


def test_upload_rejects_empty_file(upload_ok) -> None:
    response = _client(_verified_user(), FakeSession(), FakeQueue()).post(
        "/projects/upload",
        files={"file": ("empty.mp3", BytesIO(b""), "audio/mpeg")},
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 422
    assert response.json()["error"] == "file_empty"


def test_upload_maps_corrupt(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def boom(path):
        raise AudioUploadError("file_corrupt", "bad")

    monkeypatch.setattr(projects_router, "probe_audio", boom)
    response = _client(_verified_user(), FakeSession(), FakeQueue()).post(
        "/projects/upload",
        files=_mp3_files("fake.mp3", b"not really mp3"),
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 422
    assert response.json()["error"] == "file_corrupt"


def test_stream_aborts_over_limit_without_full_read(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Over-limit body is aborted while streaming (SEC-04)."""
    import asyncio

    monkeypatch.setattr(settings, "max_upload_mb", 1)
    limit = settings.max_upload_mb * 1024 * 1024
    chunk = b"x" * (64 * 1024)
    chunks_read = {"n": 0}

    class FakeUpload:
        filename = "big.mp3"

        async def read(self, size: int = -1):
            chunks_read["n"] += 1
            # Keep offering chunks past the limit; the streamer must stop.
            if chunks_read["n"] > 40:
                return b""
            return chunk

    with pytest.raises(Exception) as exc_info:
        asyncio.run(
            projects_router._stream_upload_to_temp(
                FakeUpload(),  # type: ignore[arg-type]
                ext=".mp3",
                limit=limit,
            )
        )
    # HTTPException 413
    assert getattr(exc_info.value, "status_code", None) == 413
    # Must have aborted well before reading a huge number of chunks.
    assert chunks_read["n"] < 30
    detail = getattr(exc_info.value, "detail", {})
    assert detail["error"] == "file_too_large"
