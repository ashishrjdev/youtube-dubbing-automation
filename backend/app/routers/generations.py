from datetime import datetime
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.core.stubs import not_implemented

router = APIRouter(tags=["generations"])


class GenerationCreate(BaseModel):
    speed: float = Field(default=0.9, gt=0)


class GenerationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    audio_file_url: str
    status: str
    speed: float
    created_at: datetime


@router.get("/projects/{project_id}/generations", response_model=list[GenerationResponse])
def list_generations(_project_id: UUID) -> None:
    not_implemented()


@router.post("/projects/{project_id}/generations", response_model=GenerationResponse, status_code=201)
def create_generation(_project_id: UUID, _payload: GenerationCreate) -> None:
    not_implemented()
