import logging

logger = logging.getLogger(__name__)


def rewrite_job(project_id: str) -> None:
    logger.info("rewrite_job started project_id=%s", project_id)
