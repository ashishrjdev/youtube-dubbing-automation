import logging

logger = logging.getLogger(__name__)


def generate_audio_job(project_id: str, generation_id: str | None = None) -> None:
    logger.info(
        "generate_audio_job started project_id=%s generation_id=%s",
        project_id,
        generation_id,
    )
