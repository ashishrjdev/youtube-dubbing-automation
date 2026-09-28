from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.core.stubs import not_implemented
from app.core.validation import (
    MAX_SCRIPT_TEXT_LENGTH,
    DraftScriptText,
    RequestModel,
    ScriptText,
)

router = APIRouter(tags=["script_lines"])

OrderIndex = Annotated[float, Field(allow_inf_nan=False)]


class ScriptLineCreate(RequestModel):
    speaker_id: UUID
    order_index: OrderIndex
    original_text: ScriptText
    rewritten_text: DraftScriptText = ""


class ScriptLineUpdate(RequestModel):
    speaker_id: UUID | None = None
    order_index: OrderIndex | None = None
    original_text: ScriptText | None = None
    rewritten_text: ScriptText | None = None


class ScriptLineSplitRequest(RequestModel):
    split_at: int = Field(
        gt=0,
        lt=MAX_SCRIPT_TEXT_LENGTH,
        description="Character index in rewritten_text (or original_text) to split at",
    )


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
def list_script_lines(project_id: UUID) -> None:
    not_implemented()


@router.post("/projects/{project_id}/script-lines", response_model=ScriptLineResponse, status_code=201)
def create_script_line(project_id: UUID, _payload: ScriptLineCreate) -> None:
    not_implemented()


@router.get("/script-lines/{line_id}", response_model=ScriptLineResponse)
def get_script_line(line_id: UUID) -> None:
    not_implemented()


@router.patch("/script-lines/{line_id}", response_model=ScriptLineResponse)
def update_script_line(line_id: UUID, _payload: ScriptLineUpdate) -> None:
    not_implemented()


@router.delete("/script-lines/{line_id}", status_code=204)
def delete_script_line(line_id: UUID) -> None:
    not_implemented()


@router.post("/script-lines/{line_id}/split", response_model=list[ScriptLineResponse])
def split_script_line(line_id: UUID, _payload: ScriptLineSplitRequest) -> None:
    not_implemented()
