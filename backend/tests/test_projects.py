from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.queue import get_queue
from app.main import create_app
from app.models.project import Project, ProjectStatus
from app.services.youtube import VideoInfo, YoutubeServiceError

FAKE_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl"
VIDEO_ID = "dQw4w9WgXcQ"
VALID_URL = f"https://youtu.be/{VIDEO_ID}"
CANONICAL = f"https://www.youtube.com/watch?v={VIDEO_ID}"


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
    def __init__(self, existing: Project | None = None) -> None:
        self.added: list[Project] = []
        self.committed = 0
        self.existing = existing

    def add(self, obj) -> None:
        self.added.append(obj)

    def commit(self) -> None:
        self.committed += 1

    def refresh(self, obj) -> None:
        if getattr(obj, "created_at", None) is None:
            obj.created_at = datetime.now(UTC)
        if getattr(obj, "updated_at", None) is None:
            obj.updated_at = obj.created_at

    def query(self, model):
        assert model is Project
        return FakeQuery(self.existing)


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


@pytest.fixture
def video_info() -> VideoInfo:
    return VideoInfo(
        title="Test Video",
        duration=120,
        thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        is_live=False,
    )


def test_create_project_success(monkeypatch: pytest.MonkeyPatch, video_info: VideoInfo) -> None:
    user = _verified_user()
    db = FakeSession()
    queue = FakeQueue()
    monkeypatch.setattr("app.routers.projects.fetch_video_info", lambda video_id: video_info)

    response = _client(user, db, queue).post(
        "/projects",
        json={"source_type": "youtube_url", "source_ref": VALID_URL},
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["source_ref"] == CANONICAL
    assert body["title"] == "Test Video"
    assert body["duration_seconds"] == 120
    assert body["thumbnail_url"] == video_info.thumbnail
    assert body["status"] == ProjectStatus.transcribing.value
    assert body["user_id"] == user.id
    assert len(db.added) == 1
    assert queue.enqueued[0][0] == "transcribe_job"
    assert queue.enqueued[0][1] == (str(db.added[0].id),)


@pytest.mark.parametrize(
    ("code", "message", "status_code"),
    [
        ("invalid_url", "That doesn't look like a YouTube video link.", 422),
        ("video_unavailable", "That video is private, deleted, or unavailable.", 422),
        ("video_restricted", "restricted", 422),
        ("video_live", "live", 422),
        ("video_too_long", "longer", 422),
        ("youtube_unreachable", "couldn't reach", 504),
        ("extraction_failed", "couldn't read", 502),
    ],
)
def test_create_project_maps_youtube_errors(
    monkeypatch: pytest.MonkeyPatch, code: str, message: str, status_code: int
) -> None:
    user = _verified_user()
    db = FakeSession()
    queue = FakeQueue()

    def boom(video_id: str):
        raise YoutubeServiceError(code, message, status_code=status_code)

    if code == "invalid_url":
        monkeypatch.setattr(
            "app.routers.projects.parse_youtube_url",
            lambda raw: (_ for _ in ()).throw(YoutubeServiceError(code, message)),
        )
    else:
        monkeypatch.setattr("app.routers.projects.fetch_video_info", boom)

    response = _client(user, db, queue).post(
        "/projects",
        json={"source_type": "youtube_url", "source_ref": VALID_URL},
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )

    assert response.status_code == status_code
    body = response.json()
    assert body["error"] == code
    assert message.split()[0].lower() in body["message"].lower() or message in body["message"]
    assert db.added == []
    assert queue.enqueued == []


def test_unverified_user_gets_email_not_verified() -> None:
    response = _client(_unverified_user(), FakeSession(), FakeQueue()).post(
        "/projects",
        json={"source_type": "youtube_url", "source_ref": VALID_URL},
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 403
    body = response.json()
    assert body["error"] == "email_not_verified"
    assert body["message"] == "Email not verified"


def test_no_token_is_401() -> None:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: FakeSession()
    app.dependency_overrides[get_queue] = lambda: FakeQueue()
    response = TestClient(app).post(
        "/projects", json={"source_type": "youtube_url", "source_ref": VALID_URL}
    )
    assert response.status_code == 401


def test_get_other_users_project_is_same_404_as_missing() -> None:
    owner = uuid4()
    other = _verified_user()
    existing = Project(
        id=uuid4(),
        user_id=owner,
        source_type="youtube_url",
        source_ref=CANONICAL,
        status=ProjectStatus.transcribing.value,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    # Query filters by user_id, so FakeQuery returns None (not owned).
    db = FakeSession(existing=None)
    response = _client(other, db, FakeQueue()).get(
        f"/projects/{existing.id}",
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 404
    assert response.json()["error"] == "not_found"

    missing = _client(other, FakeSession(existing=None), FakeQueue()).get(
        f"/projects/{uuid4()}",
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert missing.status_code == 404
    assert missing.json()["error"] == "not_found"


def test_get_own_project(video_info: VideoInfo) -> None:
    user = _verified_user()
    project = Project(
        id=uuid4(),
        user_id=UUID(user.id),
        source_type="youtube_url",
        source_ref=CANONICAL,
        title=video_info.title,
        duration_seconds=video_info.duration,
        thumbnail_url=video_info.thumbnail,
        status=ProjectStatus.transcribing.value,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    response = _client(user, FakeSession(existing=project), FakeQueue()).get(
        f"/projects/{project.id}",
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 200
    assert response.json()["title"] == video_info.title


def test_enqueue_failure_marks_failed(
    monkeypatch: pytest.MonkeyPatch, video_info: VideoInfo
) -> None:
    user = _verified_user()
    db = FakeSession()
    queue = FakeQueue(fail=True)
    monkeypatch.setattr("app.routers.projects.fetch_video_info", lambda video_id: video_info)

    response = _client(user, db, queue).post(
        "/projects",
        json={"source_type": "youtube_url", "source_ref": VALID_URL},
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )

    assert response.status_code == 503
    assert response.json()["error"] == "queue_unavailable"
    assert db.added[0].status == ProjectStatus.failed.value


def test_fetch_uses_canonical_url_only(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify yt-dlp is only ever called with the canonical watch URL (PROJ-01 §6)."""
    seen: list[str] = []

    class FakeYDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def extract_info(self, url, download=True):
            seen.append(url)
            assert download is False
            return {
                "title": "Ok",
                "duration": 30,
                "thumbnail": None,
                "is_live": False,
                "live_status": "not_live",
            }

    monkeypatch.setattr("app.services.youtube.yt_dlp.YoutubeDL", FakeYDL)
    from app.services.youtube import fetch_video_info

    info = fetch_video_info(VIDEO_ID)
    assert info.title == "Ok"
    assert seen == [CANONICAL]


def test_live_stream_error_maps_before_unavailable() -> None:
    """yt-dlp often says 'live stream … not available' — that must be video_live."""
    from yt_dlp.utils import DownloadError

    from app.services.youtube import _map_ytdlp_error

    err = _map_ytdlp_error(
        DownloadError("ERROR: [youtube] x: This live stream recording is not available."),
        "x",
    )
    assert err.code == "video_live"
