import logging
import uuid
from datetime import datetime
from typing import Annotated, Self
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, model_validator
from rq import Queue
from sqlalchemy.orm import Session
from supabase_auth.types import User

from app.core.auth import CurrentUser, VerifiedUser
from app.core.database import get_db
from app.core.queue import get_queue
from app.core.stubs import not_implemented
from app.core.validation import RequestModel, SourceRef, validate_youtube_url
from app.models.project import Project, ProjectStatus, SourceType
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


def _youtube_http_error(exc: YoutubeServiceError) -> HTTPException:
    return HTTPException(
        status_code=exc.status_code,
        detail={"error": exc.code, "message": exc.message},
    )


def _user_uuid(user: User) -> UUID:
    return UUID(str(user.id))


@router.get("", response_model=list[ProjectResponse])
def list_projects() -> None:
    not_implemented()


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
