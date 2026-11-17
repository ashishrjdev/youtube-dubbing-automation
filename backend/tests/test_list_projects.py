from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.queue import get_queue
from app.main import create_app
from app.models.project import Project, ProjectStatus

FAKE_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl"


class FakeQueue:
    def enqueue(self, *args, **kwargs):
        return SimpleNamespace(id="job-1")


class ListFakeQuery:
    def __init__(self, rows: list[Project]):
        self._rows = list(rows)
        self._offset = 0
        self._limit: int | None = None

    def filter(self, *criteria):
        for criterion in criteria:
            value = getattr(getattr(criterion, "right", None), "value", None)
            if value is not None:
                self._rows = [row for row in self._rows if row.user_id == value]
        return self

    def count(self) -> int:
        return len(self._rows)

    def order_by(self, *args, **kwargs):
        self._rows.sort(key=lambda p: (p.updated_at, p.id), reverse=True)
        return self

    def offset(self, value: int):
        self._offset = value
        return self

    def limit(self, value: int):
        self._limit = value
        return self

    def all(self) -> list[Project]:
        end = None if self._limit is None else self._offset + self._limit
        return self._rows[self._offset : end]


class ListFakeSession:
    def __init__(self, rows: list[Project]):
        self.rows = rows

    def query(self, model):
        assert model is Project
        return ListFakeQuery(self.rows)


def _user(user_id=None, *, confirmed: bool = True):
    return SimpleNamespace(
        id=str(user_id or uuid4()),
        email="a@example.com",
        email_confirmed_at=datetime.now(UTC) if confirmed else None,
    )


def _project(user_id: UUID, *, updated_at: datetime, title: str = "P") -> Project:
    return Project(
        id=uuid4(),
        user_id=user_id,
        source_type="youtube_url",
        source_ref="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title=title,
        duration_seconds=60,
        thumbnail_url="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        status=ProjectStatus.transcribing.value,
        created_at=updated_at,
        updated_at=updated_at,
    )


def _client(user, db: ListFakeSession) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_queue] = lambda: FakeQueue()
    return TestClient(app)


def test_list_returns_only_caller_projects_ordered() -> None:
    owner = uuid4()
    other = uuid4()
    now = datetime.now(UTC)
    rows = [
        _project(owner, updated_at=now - timedelta(hours=2), title="older"),
        _project(other, updated_at=now, title="secret"),
        _project(owner, updated_at=now - timedelta(hours=1), title="newer"),
        _project(owner, updated_at=now, title="newest"),
    ]

    response = _client(_user(owner), ListFakeSession(rows)).get(
        "/projects",
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    titles = [item["title"] for item in body["items"]]
    assert titles == ["newest", "newer", "older"]
    assert "secret" not in titles
    for item in body["items"]:
        assert "user_id" not in item
        assert "source_ref" not in item
        assert set(item.keys()) == {
            "id",
            "title",
            "source_type",
            "thumbnail_url",
            "duration_seconds",
            "status",
            "created_at",
            "updated_at",
        }


def test_list_user_b_cannot_see_user_a() -> None:
    a = uuid4()
    b = uuid4()
    now = datetime.now(UTC)
    rows = [
        _project(a, updated_at=now, title="a-only"),
        _project(b, updated_at=now, title="b-only"),
    ]
    response = _client(_user(b), ListFakeSession(rows)).get(
        "/projects",
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "b-only"


def test_list_limit_offset() -> None:
    owner = uuid4()
    now = datetime.now(UTC)
    rows = [
        _project(owner, updated_at=now - timedelta(minutes=i), title=f"p{i}")
        for i in range(5)
    ]
    client = _client(_user(owner), ListFakeSession(rows))
    page1 = client.get(
        "/projects?limit=2&offset=0",
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    ).json()
    page2 = client.get(
        "/projects?limit=2&offset=2",
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    ).json()
    assert page1["total"] == 5
    assert len(page1["items"]) == 2
    assert len(page2["items"]) == 2
    assert page1["items"][0]["id"] != page2["items"][0]["id"]


def test_list_rejects_out_of_range_params() -> None:
    client = _client(_user(), ListFakeSession([]))
    headers = {"Authorization": f"Bearer {FAKE_JWT}"}
    assert client.get("/projects?limit=0", headers=headers).status_code == 422
    assert client.get("/projects?limit=51", headers=headers).status_code == 422
    assert client.get("/projects?offset=-1", headers=headers).status_code == 422


def test_list_no_token_401() -> None:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: ListFakeSession([])
    app.dependency_overrides[get_queue] = lambda: FakeQueue()
    assert TestClient(app).get("/projects").status_code == 401


def test_list_empty_account() -> None:
    response = _client(_user(), ListFakeSession([])).get(
        "/projects",
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_list_allows_unverified() -> None:
    response = _client(_user(confirmed=False), ListFakeSession([])).get(
        "/projects",
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_list_ignores_client_supplied_user_id() -> None:
    owner = uuid4()
    other = uuid4()
    now = datetime.now(UTC)
    rows = [
        _project(owner, updated_at=now, title="mine"),
        _project(other, updated_at=now, title="theirs"),
    ]
    response = _client(_user(owner), ListFakeSession(rows)).get(
        f"/projects?user_id={other}",
        headers={"Authorization": f"Bearer {FAKE_JWT}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["title"] == "mine"
