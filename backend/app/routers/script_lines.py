from datetime import datetime
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.core.stubs import not_implemented

router = APIRouter(tags=["script_lines"])


class ScriptLineCreate(BaseModel):
    speaker_id: UUID
    order_index: float
    original_text: str
    rewritten_text: str = ""


class ScriptLineUpdate(BaseModel):
    speaker_id: UUID | None = None
    order_index: float | None = None
    original_text: str | None = None
    rewritten_text: str | None = None


class ScriptLineSplitRequest(BaseModel):
    split_at: int = Field(ge=0, description="Character index in rewritten_text (or original_text) to split at")


class ScriptLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    speaker_id: UUID
    order_index: float
    original_text: str
    rewritten_text: str
    updated_at: datetime


@router.get("/projects/{project_id}/script-lines", response_model=list[ScriptLineResponse])
def list_script_lines(_project_id: UUID) -> None:
    not_implemented()


@router.post("/projects/{project_id}/script-lines", response_model=ScriptLineResponse, status_code=201)
def create_script_line(_project_id: UUID, _payload: ScriptLineCreate) -> None:
    not_implemented()


@router.get("/script-lines/{line_id}", response_model=ScriptLineResponse)
def get_script_line(_line_id: UUID) -> None:
    not_implemented()


@router.patch("/script-lines/{line_id}", response_model=ScriptLineResponse)
def update_script_line(_line_id: UUID, _payload: ScriptLineUpdate) -> None:
    not_implemented()


@router.delete("/script-lines/{line_id}", status_code=204)
def delete_script_line(_line_id: UUID) -> None:
    not_implemented()


@router.post("/script-lines/{line_id}/split", response_model=list[ScriptLineResponse])
def split_script_line(_line_id: UUID, _payload: ScriptLineSplitRequest) -> None:
    not_implemented()
