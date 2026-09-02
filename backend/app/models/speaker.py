from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.script_line import ScriptLine


class Speaker(Base):
    __tablename__ = "speakers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    diarized_label: Mapped[str] = mapped_column(String, nullable=False)
    character_name: Mapped[str | None] = mapped_column(String, nullable=True)
    elevenlabs_voice_id: Mapped[str | None] = mapped_column(String, nullable=True)

    project: Mapped[Project] = relationship(back_populates="speakers")
    script_lines: Mapped[list[ScriptLine]] = relationship(back_populates="speaker")
