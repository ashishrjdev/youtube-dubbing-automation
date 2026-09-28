import logging
import sys

from app.core.config import settings

# These log raw HTTP headers at DEBUG, which include the Supabase apikey
# (service role key on admin calls) and users' Bearer JWTs.
_HEADER_LOGGING_LIBRARIES = ("hpack", "h2", "httpcore")


def configure_logging() -> None:
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stdout,
        force=True,
    )
    for name in _HEADER_LOGGING_LIBRARIES:
        logging.getLogger(name).setLevel(logging.WARNING)
