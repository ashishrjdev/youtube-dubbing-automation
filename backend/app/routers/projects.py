from datetime import datetime
from typing import Self
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, model_validator

from app.core.stubs import not_implemented
from app.core.validation import RequestModel, SourceRef, validate_youtube_url
from app.models.project import ProjectStatus, SourceType

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(RequestModel):
    source_type: SourceType
    source_ref: SourceRef

    @model_validator(mode="after")
    def check_youtube_url(self) -> Self:
        if self.source_type is SourceType.youtube_url:
            validate_youtube_url(self.source_ref)
        return self


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
    status: str
    created_at: datetime
    updated_at: datetime


@router.get("", response_model=list[ProjectResponse])
def list_projects() -> None:
    not_implemented()


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(_payload: ProjectCreate) -> None:
    not_implemented()


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: UUID) -> None:
    not_implemented()


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: UUID, _payload: ProjectUpdate) -> None:
    not_implemented()


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: UUID) -> None:
    not_implemented()
