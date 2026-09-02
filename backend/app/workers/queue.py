from redis import Redis
from rq import Queue

from app.core.config import settings

DEFAULT_QUEUE_NAME = "default"


def get_redis() -> Redis:
    url = settings.redis_url or "redis://localhost:6379/0"
    return Redis.from_url(url)


def get_queue(name: str = DEFAULT_QUEUE_NAME) -> Queue:
    return Queue(name, connection=get_redis())
