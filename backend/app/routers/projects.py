from datetime import datetime
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.core.stubs import not_implemented
from app.models.project import ProjectStatus, SourceType

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    source_type: SourceType
    source_ref: str = Field(min_length=1)


class ProjectUpdate(BaseModel):
    source_type: SourceType | None = None
    source_ref: str | None = None
    status: ProjectStatus | None = None


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
def get_project(_project_id: UUID) -> None:
    not_implemented()


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(_project_id: UUID, _payload: ProjectUpdate) -> None:
    not_implemented()


@router.delete("/{project_id}", status_code=204)
def delete_project(_project_id: UUID) -> None:
    not_implemented()
