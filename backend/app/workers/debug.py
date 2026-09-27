import logging
import time

logger = logging.getLogger(__name__)


def sleep_job(seconds: int) -> dict[str, int]:
    logger.info("sleep_job started seconds=%s", seconds)
    time.sleep(seconds)
    logger.info("sleep_job finished seconds=%s", seconds)
    return {"slept_seconds": seconds}


def failing_job() -> None:
    logger.info("failing_job started")
    raise RuntimeError("failing_job raised on purpose")
