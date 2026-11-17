import logging
import os
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Annotated, Self
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, model_validator
from rq import Queue
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException
from supabase_auth.types import User

from app.core.auth import CurrentUser, VerifiedUser
from app.core.database import get_db
from app.core.queue import get_queue
from app.core.stubs import not_implemented
from app.core.validation import RequestModel, SourceRef, validate_youtube_url
from app.models.project import Project, ProjectStatus, SourceType
from app.services import storage
from app.services.audio_upload import (
    STREAM_CHUNK_SIZE,
    AudioUploadError,
    content_type_for_extension,
    extension_for_filename,
    max_upload_bytes,
    probe_audio,
    sanitize_upload_title,
    source_storage_filename,
)
from app.services.youtube import (
    YoutubeServiceError,
    canonical_youtube_url,
    fetch_video_info,
    parse_youtube_url,
)
from app.workers import transcribe_job

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(RequestModel):
    source_type: SourceType
    source_ref: SourceRef


class ProjectUpdate(RequestModel):
    source_type: SourceType | None = None
    source_ref: SourceRef | None = None
    status: ProjectStatus | None = None

    @model_validator(mode="after")
    def check_youtube_url(self) -> Self:
        if self.source_type is SourceType.youtube_url:
            if self.source_ref is None:
                raise ValueError("source_ref is required when changing source_type")
            validate_youtube_url(self.source_ref)
        return self


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    source_type: str
    source_ref: str
    title: str | None = None
    duration_seconds: int | None = None
    thumbnail_url: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class ProjectListItem(BaseModel):
    """Dashboard card fields only — never expose user_id or source_ref (PROJ-03)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str | None = None
    source_type: str
    thumbnail_url: str | None = None
    duration_seconds: int | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    items: list[ProjectListItem]
    total: int


def _youtube_http_error(exc: YoutubeServiceError) -> HTTPException:
    return HTTPException(
        status_code=exc.status_code,
        detail={"error": exc.code, "message": exc.message},
    )


def _upload_http_error(exc: AudioUploadError) -> HTTPException:
    return HTTPException(
        status_code=exc.status_code,
        detail={"error": exc.code, "message": exc.message},
    )


def _user_uuid(user: User) -> UUID:
    return UUID(str(user.id))


def _file_too_large() -> HTTPException:
    from app.core.config import settings

    return HTTPException(
        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        detail={
            "error": "file_too_large",
            "message": f"That file is too large. The limit is {settings.max_upload_mb} MB.",
        },
    )


async def _stream_upload_to_temp(upload: UploadFile, *, ext: str, limit: int) -> Path:
    """Write the upload to a temp file in chunks; abort if over ``limit`` bytes."""
    fd, raw_path = tempfile.mkstemp(prefix="upload_", suffix=ext)
    path = Path(raw_path)
    total = 0
    try:
        with os.fdopen(fd, "wb") as out:
            while True:
                chunk = await upload.read(STREAM_CHUNK_SIZE)
                if not chunk:
                    break
                total += len(chunk)
                if total > limit:
                    raise _file_too_large()
                out.write(chunk)
        if total == 0:
            raise AudioUploadError("file_empty", "That file is empty.")
        return path
    except Exception:
        path.unlink(missing_ok=True)
        raise


@router.get("", response_model=ProjectListResponse)
def list_projects(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ProjectListResponse:
    """List the caller's projects for the dashboard (PROJ-03).

    Scoped only by the authenticated user's id — never from query/body.
    Unverified users may call this (typically empty).
    """
    user_id = _user_uuid(user)
    base = db.query(Project).filter(Project.user_id == user_id)
    total = base.count()
    items = (
        base.order_by(Project.updated_at.desc(), Project.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return ProjectListResponse(items=items, total=total)


@router.post("/upload", response_model=ProjectResponse, status_code=201)
async def upload_project(
    request: Request,
    user: VerifiedUser,
    db: Annotated[Session, Depends(get_db)],
    queue: Annotated[Queue, Depends(get_queue)],
) -> Project:
    """Create a project from a temporary audio upload (PROJ-02 / SEC-04)."""
    from app.core.config import settings

    limit = max_upload_bytes()

    # Early reject from Content-Length when present — do not trust it alone.
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            # Multipart has a small overhead beyond the file bytes.
            if int(content_length) > limit + (1024 * 1024):
                raise _file_too_large()
        except ValueError:
            pass

    try:
        form = await request.form(max_part_size=limit)
    except MultiPartException as exc:
        message = str(exc).lower()
        if "maximum size" in message or "exceeded" in message:
            raise _file_too_large() from exc
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"error": "file_corrupt", "message": "We couldn't read that upload."},
        ) from exc

    file = form.get("file")
    if not isinstance(file, UploadFile):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "error": "file_empty",
                "message": "Choose an audio file to upload.",
            },
        )

    temp_path: Path | None = None
    stored_path: str | None = None
    project: Project | None = None

    try:
        try:
            ext = extension_for_filename(file.filename)
        except AudioUploadError as exc:
            raise _upload_http_error(exc) from exc

        try:
            temp_path = await _stream_upload_to_temp(file, ext=ext, limit=limit)
        except AudioUploadError as exc:
            raise _upload_http_error(exc) from exc

        try:
            probed = probe_audio(temp_path)
        except AudioUploadError as exc:
            raise _upload_http_error(exc) from exc

        project_id = uuid.uuid4()
        object_name = source_storage_filename(ext)
        stored_path = storage.upload_path(str(project_id), object_name)
        title = sanitize_upload_title(file.filename)

        try:
            file_bytes = temp_path.read_bytes()
            storage.upload_file(
                stored_path,
                file_bytes,
                content_type_for_extension(ext),
            )
        except storage.StorageError:
            logger.exception("storage upload failed project_id=%s", project_id)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "error": "storage_failed",
                    "message": "We couldn't store that file. Please try again in a moment.",
                },
            ) from None

        project = Project(
            id=project_id,
            user_id=_user_uuid(user),
            source_type=SourceType.upload.value,
            source_ref=stored_path,
            title=title,
            duration_seconds=probed.duration_seconds,
            thumbnail_url=None,
            status=ProjectStatus.transcribing.value,
        )
        try:
            db.add(project)
            db.commit()
            db.refresh(project)
        except Exception:
            logger.exception("db insert failed project_id=%s", project_id)
            try:
                storage.delete_file(stored_path)
            except storage.StorageError:
                logger.exception("cleanup after db failure failed path=%s", stored_path)
            stored_path = None
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "error": "storage_failed",
                    "message": "We couldn't save that project. Please try again in a moment.",
                },
            ) from None

        logger.info(
            "upload_project project_id=%s duration_s=%s size_cap_mb=%s",
            project.id,
            probed.duration_seconds,
            settings.max_upload_mb,
        )

        try:
            queue.enqueue(transcribe_job, str(project.id))
        except Exception:
            logger.exception("enqueue transcribe_job failed project_id=%s", project.id)
            try:
                storage.delete_file(stored_path)
            except storage.StorageError:
                logger.exception(
                    "cleanup after enqueue failure failed path=%s", stored_path
                )
            stored_path = None
            # Do not leave a half-created upload project that will never run.
            db.delete(project)
            db.commit()
            project = None
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "error": "queue_unavailable",
                    "message": "We couldn't start processing. Please try again in a moment.",
                },
            ) from None

        return project
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
        await form.close()


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    payload: ProjectCreate,
    user: VerifiedUser,
    db: Annotated[Session, Depends(get_db)],
    queue: Annotated[Queue, Depends(get_queue)],
) -> Project:
    if payload.source_type is not SourceType.youtube_url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "error": "unsupported_source",
                "message": "Only YouTube URLs are supported right now.",
            },
        )

    try:
        video_id = parse_youtube_url(payload.source_ref)
    except YoutubeServiceError as exc:
        raise _youtube_http_error(exc) from exc

    # Log only the validated ID — never the raw user URL at INFO.
    logger.info("create_project video_id=%s", video_id)

    try:
        info = fetch_video_info(video_id)
    except YoutubeServiceError as exc:
        raise _youtube_http_error(exc) from exc

    project = Project(
        id=uuid.uuid4(),
        user_id=_user_uuid(user),
        source_type=SourceType.youtube_url.value,
        source_ref=canonical_youtube_url(video_id),
        title=info.title,
        duration_seconds=info.duration,
        thumbnail_url=info.thumbnail,
        status=ProjectStatus.transcribing.value,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    try:
        queue.enqueue(transcribe_job, str(project.id))
    except Exception:
        logger.exception("enqueue transcribe_job failed project_id=%s", project.id)
        project.status = ProjectStatus.failed.value
        db.add(project)
        db.commit()
        db.refresh(project)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "queue_unavailable",
                "message": "We couldn't start processing. Please try again in a moment.",
            },
        ) from None

    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: UUID,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == _user_uuid(user))
        .one_or_none()
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "not_found", "message": "Project not found."},
        )
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: UUID, _payload: ProjectUpdate) -> None:
    not_implemented()


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: UUID) -> None:
    not_implemented()
