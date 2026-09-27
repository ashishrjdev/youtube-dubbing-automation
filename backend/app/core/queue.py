from functools import lru_cache

from redis import Redis
from rq import Queue

from app.core.config import settings

DEFAULT_QUEUE_NAME = "default"


@lru_cache
def get_redis() -> Redis:
    url = settings.redis_url
    if not url:
        if settings.is_development:
            url = "redis://localhost:6379/0"
        else:
            raise RuntimeError("REDIS_URL is not set")
    return Redis.from_url(url)


@lru_cache
def get_queue() -> Queue:
    return Queue(DEFAULT_QUEUE_NAME, connection=get_redis())
