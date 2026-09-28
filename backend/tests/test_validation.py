import re
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.core.validation import MAX_SCRIPT_TEXT_LENGTH
from app.main import create_app

VALID_YOUTUBE_URLS = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=42",
    "http://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVM",
    "youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc123",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ?feature=share",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
]

INVALID_YOUTUBE_URLS = [
    "not a url",
    "https://vimeo.com/123456",
    "https://youtube.com/watch?v=short",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
    "https://evil.com/?u=youtube.com/watch?v=dQw4w9WgXcQ",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
    "--exec=rm -rf / https://youtu.be/dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ extra",
    "file:///etc/passwd",
]


@pytest.fixture
def client() -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=str(uuid4()), email="a@example.com"
    )
    return TestClient(app)


def assert_validation_error(response, *locs: list) -> None:
    assert response.status_code == 422, response.text
    body = response.json()
    assert body["error"] == "validation_error"
    assert set(body) == {"error", "details"}
    for detail in body["details"]:
        assert set(detail) == {"loc", "msg", "type"}
    assert [d["loc"] for d in body["details"]] == list(locs)


def test_wrong_type_and_missing_field_use_clean_shape(client: TestClient) -> None:
    response = client.post(
        f"/projects/{uuid4()}/script-lines",
        json={"speaker_id": "not-a-uuid", "order_index": "abc"},
    )

    assert_validation_error(
        response,
        ["body", "speaker_id"],
        ["body", "order_index"],
        ["body", "original_text"],
    )


def test_malformed_json_uses_clean_shape(client: TestClient) -> None:
    response = client.post(
        "/projects",
        content=b'{"source_type": ',
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 422
    assert response.json()["error"] == "validation_error"


def test_invalid_path_param_uses_clean_shape(client: TestClient) -> None:
    assert_validation_error(client.get("/projects/123"), ["path", "project_id"])


def test_every_path_placeholder_is_a_typed_path_param(client: TestClient) -> None:
    """A handler arg that doesn't match its {placeholder} silently becomes a query param."""
    for route_path, operations in client.app.openapi()["paths"].items():
        placeholders = set(re.findall(r"\{([^}]+)\}", route_path))
        for method, operation in operations.items():
            params = operation.get("parameters", [])
            declared = {p["name"] for p in params if p["in"] == "path"}
            assert declared == placeholders, f"{method} {route_path}"
            assert not [p["name"] for p in params if p["name"].startswith("_")]


def test_oversized_string_rejected(client: TestClient) -> None:
    response = client.post(
        f"/projects/{uuid4()}/script-lines",
        json={
            "speaker_id": str(uuid4()),
            "order_index": 1,
            "original_text": "x" * (MAX_SCRIPT_TEXT_LENGTH + 1),
        },
    )

    assert_validation_error(response, ["body", "original_text"])
    assert response.json()["details"][0]["type"] == "string_too_long"
    assert "xxxx" not in response.text


@pytest.mark.parametrize("value", ["", "   ", "\n\t "])
def test_blank_required_text_rejected(client: TestClient, value: str) -> None:
    response = client.patch(
        f"/script-lines/{uuid4()}", json={"original_text": value}
    )

    assert_validation_error(response, ["body", "original_text"])


@pytest.mark.parametrize("value", ["", "   "])
def test_blank_character_name_rejected(client: TestClient, value: str) -> None:
    response = client.patch(f"/speakers/{uuid4()}", json={"character_name": value})

    assert_validation_error(response, ["body", "character_name"])


def test_oversized_character_name_rejected(client: TestClient) -> None:
    response = client.patch(f"/speakers/{uuid4()}", json={"character_name": "a" * 101})

    assert_validation_error(response, ["body", "character_name"])


@pytest.mark.parametrize("url", INVALID_YOUTUBE_URLS)
def test_malformed_youtube_url_rejected(client: TestClient, url: str) -> None:
    response = client.post(
        "/projects", json={"source_type": "youtube_url", "source_ref": url}
    )

    assert_validation_error(response, ["body"])


@pytest.mark.parametrize("url", VALID_YOUTUBE_URLS)
def test_valid_youtube_url_passes_validation(client: TestClient, url: str) -> None:
    response = client.post(
        "/projects", json={"source_type": "youtube_url", "source_ref": url}
    )

    assert response.status_code == 501


def test_youtube_url_check_applies_on_update(client: TestClient) -> None:
    project = f"/projects/{uuid4()}"

    assert_validation_error(
        client.patch(project, json={"source_type": "youtube_url", "source_ref": "nope"}),
        ["body"],
    )
    assert_validation_error(
        client.patch(project, json={"source_type": "youtube_url"}), ["body"]
    )


def test_unknown_fields_rejected(client: TestClient) -> None:
    response = client.post(
        f"/projects/{uuid4()}/generations", json={"speed": 1.0, "user_id": "x"}
    )

    assert_validation_error(response, ["body", "user_id"])


@pytest.mark.parametrize("speed", [0, 0.5, 1.5, -1])
def test_generation_speed_bounds(client: TestClient, speed: float) -> None:
    response = client.post(f"/projects/{uuid4()}/generations", json={"speed": speed})

    assert_validation_error(response, ["body", "speed"])


def test_invalid_voice_id_rejected(client: TestClient) -> None:
    response = client.patch(
        f"/speakers/{uuid4()}", json={"elevenlabs_voice_id": "../../v1/admin"}
    )

    assert_validation_error(response, ["body", "elevenlabs_voice_id"])


def test_valid_payloads_reach_handler(client: TestClient) -> None:
    project_id = uuid4()
    assert client.post(
        f"/projects/{project_id}/script-lines",
        json={
            "speaker_id": str(uuid4()),
            "order_index": 1.5,
            "original_text": "  Hello there.  ",
        },
    ).status_code == 501
    assert client.patch(
        f"/speakers/{uuid4()}",
        json={"character_name": "Narrator", "elevenlabs_voice_id": "21m00Tcm4TlvDq8ikWAM"},
    ).status_code == 501
    assert client.post(f"/projects/{project_id}/generations", json={}).status_code == 501
