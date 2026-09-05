import logging
import sys

from rq import Worker

from app.core.config import settings
from app.workers.queue import DEFAULT_QUEUE_NAME, get_redis

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    stream=sys.stdout,
)


def main() -> None:
    redis_conn = get_redis()
    worker = Worker([DEFAULT_QUEUE_NAME], connection=redis_conn)
    worker.work()


if __name__ == "__main__":
    main()
