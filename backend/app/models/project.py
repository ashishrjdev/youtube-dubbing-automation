from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.generation import Generation
    from app.models.script_line import ScriptLine
    from app.models.speaker import Speaker


class SourceType(str, enum.Enum):
    youtube_url = "youtube_url"
    upload = "upload"


class ProjectStatus(str, enum.Enum):
    created = "created"
    transcribing = "transcribing"
    name_review = "name_review"
    script_review = "script_review"
    approved = "approved"
    voice_mapping = "voice_mapping"
    audio_generating = "audio_generating"
    completed = "completed"
    failed = "failed"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # References a Supabase Auth user (auth.users.id). No DB-level FK so local
    # Postgres without the auth schema still migrates cleanly.
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String, nullable=False)
    source_ref: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default=ProjectStatus.created.value)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    speakers: Mapped[list[Speaker]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    script_lines: Mapped[list[ScriptLine]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    generations: Mapped[list[Generation]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
