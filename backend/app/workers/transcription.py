import logging

logger = logging.getLogger(__name__)


def transcribe_job(project_id: str) -> None:
    logger.info("transcribe_job started project_id=%s", project_id)
