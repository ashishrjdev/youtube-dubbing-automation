import logging

import httpx
from storage3.utils import StorageException

from app.core.supabase import get_supabase_admin_client

logger = logging.getLogger(__name__)

AUDIO_BUCKET = "audio-files"


class StorageError(Exception):
    """Raised when a Supabase Storage operation fails."""


def upload_path(project_id: str, filename: str) -> str:
    return f"uploads/{project_id}/{filename}"


def generation_path(project_id: str, generation_id: str) -> str:
    return f"generations/{project_id}/{generation_id}.mp3"


def _bucket():
    # Service-role client: bypasses RLS, so it must only ever run server-side.
    return get_supabase_admin_client().storage.from_(AUDIO_BUCKET)


def upload_file(path: str, file_bytes: bytes, content_type: str) -> str:
    try:
        _bucket().upload(
            path,
            file_bytes,
            file_options={"content-type": content_type, "upsert": "false"},
        )
    except (StorageException, httpx.HTTPError) as exc:
        raise StorageError(f"Failed to upload {AUDIO_BUCKET}/{path}: {exc}") from exc
    logger.info("Uploaded %s/%s (%d bytes)", AUDIO_BUCKET, path, len(file_bytes))
    return path


def get_signed_url(path: str, expires_in: int = 3600) -> str:
    try:
        response = _bucket().create_signed_url(path, expires_in)
    except (StorageException, httpx.HTTPError) as exc:
        raise StorageError(
            f"Failed to sign URL for {AUDIO_BUCKET}/{path}: {exc}"
        ) from exc
    signed_url = response.get("signedURL")
    if not signed_url:
        raise StorageError(f"Supabase returned no signed URL for {AUDIO_BUCKET}/{path}")
    return signed_url


def delete_file(path: str) -> None:
    try:
        removed = _bucket().remove([path])
    except (StorageException, httpx.HTTPError) as exc:
        raise StorageError(f"Failed to delete {AUDIO_BUCKET}/{path}: {exc}") from exc
    if not removed:
        logger.warning("delete_file: %s/%s did not exist", AUDIO_BUCKET, path)
