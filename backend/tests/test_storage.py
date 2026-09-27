import httpx
import pytest
from storage3.exceptions import StorageApiError

from app.services import storage


class FakeBucket:
    def __init__(self, fail_with: Exception | None = None) -> None:
        self.files: dict[str, bytes] = {}
        self.fail_with = fail_with
        self.upload_options: dict | None = None

    def _maybe_fail(self) -> None:
        if self.fail_with:
            raise self.fail_with

    def upload(self, path, file, file_options=None):
        self._maybe_fail()
        self.upload_options = file_options
        self.files[path] = file
        return {"path": path}

    def create_signed_url(self, path, expires_in, options=None):
        self._maybe_fail()
        return {"signedURL": f"https://example.supabase.co/sign/{path}?exp={expires_in}"}

    def remove(self, paths):
        self._maybe_fail()
        return [{"name": p} for p in paths if self.files.pop(p, None) is not None]


@pytest.fixture
def bucket(monkeypatch) -> FakeBucket:
    fake = FakeBucket()
    monkeypatch.setattr(storage, "_bucket", lambda: fake)
    return fake


def test_path_helpers() -> None:
    assert storage.upload_path("p1", "a.wav") == "uploads/p1/a.wav"
    assert storage.generation_path("p1", "g1") == "generations/p1/g1.mp3"


def test_upload_sign_delete_roundtrip(bucket: FakeBucket) -> None:
    path = storage.upload_file("uploads/p1/a.wav", b"RIFF", "audio/wav")

    assert path == "uploads/p1/a.wav"
    assert bucket.files[path] == b"RIFF"
    assert bucket.upload_options["content-type"] == "audio/wav"
    assert storage.get_signed_url(path, expires_in=60).endswith("?exp=60")

    storage.delete_file(path)
    assert path not in bucket.files


@pytest.mark.parametrize(
    "error",
    [
        StorageApiError("Bucket not found", "404", 404),
        httpx.ConnectError("connection refused"),
    ],
)
def test_failures_raise_storage_error(monkeypatch, error: Exception) -> None:
    fake = FakeBucket(fail_with=error)
    monkeypatch.setattr(storage, "_bucket", lambda: fake)

    with pytest.raises(storage.StorageError, match="uploads/p1/a.wav"):
        storage.upload_file("uploads/p1/a.wav", b"RIFF", "audio/wav")
    with pytest.raises(storage.StorageError):
        storage.get_signed_url("uploads/p1/a.wav")
    with pytest.raises(storage.StorageError):
        storage.delete_file("uploads/p1/a.wav")


def test_missing_signed_url_raises(monkeypatch) -> None:
    fake = FakeBucket()
    fake.create_signed_url = lambda path, expires_in, options=None: {}
    monkeypatch.setattr(storage, "_bucket", lambda: fake)

    with pytest.raises(storage.StorageError, match="no signed URL"):
        storage.get_signed_url("uploads/p1/a.wav")
