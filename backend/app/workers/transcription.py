import logging
from uuid import UUID

from app.core.database import get_session_factory
from app.models.project import Project
from app.services.storage import delete_source_audio

logger = logging.getLogger(__name__)


def transcribe_job(project_id: str) -> None:
    """Stub transcription (INFRA-05). Always clears temporary source audio (PROJ-02)."""
    session = get_session_factory()()
    project: Project | None = None
    try:
        try:
            project = session.get(Project, UUID(project_id))
        except (ValueError, TypeError):
            logger.warning("transcribe_job invalid project_id=%s", project_id)
            project = None

        logger.info("transcribe_job started project_id=%s", project_id)
        # TRANS-01 / TRANS-02 replace this stub with real transcription.
    finally:
        if project is not None:
            delete_source_audio(project)
        session.close()
