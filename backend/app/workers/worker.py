from rq import Worker

from app.core.logging import configure_logging
from app.core.queue import DEFAULT_QUEUE_NAME, get_redis

configure_logging()

# RQ only moves jobs abandoned by a dead worker to the failed registry during
# maintenance, and an idle worker only checks for maintenance when its blocking
# dequeue (worker_ttl - 15s, default 405s) times out. Keeping both short means a
# job killed mid-run shows as "failed" within ~2.5 minutes instead of ~10.
MAINTENANCE_INTERVAL_SECONDS = 60
WORKER_TTL_SECONDS = 75


def main() -> None:
    worker = Worker(
        [DEFAULT_QUEUE_NAME],
        connection=get_redis(),
        maintenance_interval=MAINTENANCE_INTERVAL_SECONDS,
        worker_ttl=WORKER_TTL_SECONDS,
    )
    worker.work()


if __name__ == "__main__":
    main()
