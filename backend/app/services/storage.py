from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import httpx
from storage3.utils import StorageException

from app.core.supabase import get_supabase_admin_client
from app.models.project import SourceType

if TYPE_CHECKING:
    from app.models.project import Project

logger = logging.getLogger(__name__)

AUDIO_BUCKET = "audio-files"
UPLOADS_PREFIX = "uploads"


class StorageError(Exception):
    """Raised when a Supabase Storage operation fails."""


def upload_path(project_id: str, filename: str) -> str:
    return f"{UPLOADS_PREFIX}/{project_id}/{filename}"


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


def delete_source_audio(project: Project) -> None:
    """Remove temporary upload handoff audio. No-op for YouTube projects."""
    if project.source_type != SourceType.upload.value:
        return
    path = (project.source_ref or "").strip()
    if not path.startswith(f"{UPLOADS_PREFIX}/"):
        logger.warning(
            "delete_source_audio: refusing unexpected source_ref project_id=%s",
            project.id,
        )
        return
    try:
        delete_file(path)
        logger.info("Deleted source audio project_id=%s path=%s", project.id, path)
    except StorageError:
        logger.exception(
            "delete_source_audio failed project_id=%s path=%s", project.id, path
        )


def list_upload_project_folders() -> list[str]:
    """Return project-id folder names under ``uploads/``."""
    try:
        entries = _bucket().list(UPLOADS_PREFIX)
    except (StorageException, httpx.HTTPError) as exc:
        raise StorageError(f"Failed to list {AUDIO_BUCKET}/{UPLOADS_PREFIX}: {exc}") from exc
    folders: list[str] = []
    for entry in entries or []:
        name = entry.get("name") if isinstance(entry, dict) else None
        if name:
            folders.append(str(name))
    return folders


def list_upload_objects(project_id: str) -> list[dict]:
    """List objects in ``uploads/{project_id}/`` (dicts with name / updated_at / created_at)."""
    prefix = f"{UPLOADS_PREFIX}/{project_id}"
    try:
        entries = _bucket().list(prefix)
    except (StorageException, httpx.HTTPError) as exc:
        raise StorageError(f"Failed to list {AUDIO_BUCKET}/{prefix}: {exc}") from exc
    return [e for e in (entries or []) if isinstance(e, dict)]
