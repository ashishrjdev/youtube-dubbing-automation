from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from app.core.stubs import not_implemented
from app.core.validation import ElevenLabsVoiceId, Name, RequestModel

router = APIRouter(tags=["speakers"])


class SpeakerVoiceMappingUpdate(RequestModel):
    character_name: Name | None = None
    elevenlabs_voice_id: ElevenLabsVoiceId | None = None


class SpeakerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    diarized_label: str
    character_name: str | None
    elevenlabs_voice_id: str | None


@router.get("/projects/{project_id}/speakers", response_model=list[SpeakerResponse])
def list_speakers(project_id: UUID) -> None:
    not_implemented()


@router.patch("/speakers/{speaker_id}", response_model=SpeakerResponse)
def update_speaker_voice_mapping(speaker_id: UUID, _payload: SpeakerVoiceMappingUpdate) -> None:
    not_implemented()
