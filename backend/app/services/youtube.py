"""YouTube URL parsing and metadata fetch (PROJ-01).

Security: never pass the user's raw URL to yt-dlp. Only a canonical
``https://www.youtube.com/watch?v=<id>`` built from a validated ID may be used.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from urllib.parse import parse_qs, urlparse

import yt_dlp
from yt_dlp.utils import DownloadError, ExtractorError

from app.core.config import settings

logger = logging.getLogger(__name__)

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
ALLOWED_HOSTS = frozenset(
    {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
    }
)

INVALID_URL_MESSAGE = "That doesn't look like a YouTube video link."


class YoutubeServiceError(Exception):
    def __init__(self, code: str, message: str, *, status_code: int = 422) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class VideoInfo:
    title: str
    duration: int
    thumbnail: str | None
    is_live: bool


def canonical_youtube_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def parse_youtube_url(raw: str) -> str:
    """Return the 11-character video ID or raise ``YoutubeServiceError(invalid_url)``."""
    if raw is None:
        raise YoutubeServiceError("invalid_url", INVALID_URL_MESSAGE)

    text = raw.strip()
    if not text:
        raise YoutubeServiceError("invalid_url", INVALID_URL_MESSAGE)

    parsed = urlparse(text)

    if parsed.scheme.lower() not in {"http", "https"}:
        raise YoutubeServiceError("invalid_url", INVALID_URL_MESSAGE)

    # Reject credentials (user:pass@host) and non-default ports.
    if parsed.username is not None or parsed.password is not None:
        raise YoutubeServiceError("invalid_url", INVALID_URL_MESSAGE)
    if parsed.port is not None:
        raise YoutubeServiceError("invalid_url", INVALID_URL_MESSAGE)

    host = (parsed.hostname or "").lower()
    if host not in ALLOWED_HOSTS:
        raise YoutubeServiceError("invalid_url", INVALID_URL_MESSAGE)

    path = parsed.path or ""
    query = parse_qs(parsed.query)

    video_id: str | None = None

    if host == "youtu.be":
        # youtu.be/ID
        segment = path.lstrip("/").split("/", 1)[0]
        video_id = segment or None
    else:
        # youtube.com variants
        parts = [p for p in path.split("/") if p]
        if parts and parts[0] == "watch":
            # Prefer v= even when list= is also present (single video in a playlist).
            values = query.get("v") or []
            video_id = values[0] if values else None
            if video_id is None and "list" in query:
                # Playlist-only URL.
                raise YoutubeServiceError("invalid_url", INVALID_URL_MESSAGE)
        elif len(parts) >= 2 and parts[0] in {"shorts", "embed"}:
            video_id = parts[1]
        elif parts and parts[0] == "playlist":
            raise YoutubeServiceError("invalid_url", INVALID_URL_MESSAGE)

    if video_id is None or not VIDEO_ID_RE.fullmatch(video_id):
        raise YoutubeServiceError("invalid_url", INVALID_URL_MESSAGE)

    return video_id


def fetch_video_info(video_id: str) -> VideoInfo:
    """Fetch metadata via yt-dlp for a validated video ID only.

    Always calls yt-dlp with the canonical watch URL — never the raw user input.
    """
    if not VIDEO_ID_RE.fullmatch(video_id):
        raise YoutubeServiceError("invalid_url", INVALID_URL_MESSAGE)

    url = canonical_youtube_url(video_id)
    # Prefer android/tv clients for metadata — the default web client is often
    # blocked from datacenter IPs with bot checks ("page needs to be reloaded").
    opts = {
        "quiet": True,
        "noplaylist": True,
        "skip_download": True,
        "socket_timeout": 15,
        "extractor_args": {"youtube": {"player_client": ["android", "tv", "web"]}},
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            # download=False is the Python API equivalent of skip_download for extract_info.
            # SECURITY: `url` is always canonical_youtube_url(video_id), never raw user input.
            info = ydl.extract_info(url, download=False)
    except Exception as exc:
        raise _map_ytdlp_error(exc, video_id) from exc

    if not isinstance(info, dict):
        raise YoutubeServiceError(
            "extraction_failed",
            "We couldn't read that video's details. Please try again.",
            status_code=502,
        )

    live_status = info.get("live_status")
    is_live = bool(info.get("is_live")) or live_status in {"is_live", "is_upcoming"}

    duration = info.get("duration")
    title = (info.get("title") or "").strip() or "Untitled video"
    thumbnail = info.get("thumbnail")
    if isinstance(thumbnail, str):
        thumbnail = thumbnail.strip() or None
    else:
        thumbnail = None

    if is_live:
        raise YoutubeServiceError(
            "video_live",
            "Live streams and premieres that haven't aired yet can't be dubbed.",
        )

    if duration is None:
        raise YoutubeServiceError(
            "extraction_failed",
            "We couldn't read that video's details. Please try again.",
            status_code=502,
        )

    try:
        duration_seconds = int(duration)
    except (TypeError, ValueError) as exc:
        raise YoutubeServiceError(
            "extraction_failed",
            "We couldn't read that video's details. Please try again.",
            status_code=502,
        ) from exc

    max_seconds = settings.max_video_minutes * 60
    if duration_seconds > max_seconds:
        raise YoutubeServiceError(
            "video_too_long",
            f"Videos longer than {settings.max_video_minutes} minutes aren't supported yet.",
        )

    return VideoInfo(
        title=title,
        duration=duration_seconds,
        thumbnail=thumbnail,
        is_live=False,
    )


def _map_ytdlp_error(exc: Exception, video_id: str) -> YoutubeServiceError:
    text = str(exc).lower()
    # Never log the full user URL — only the validated ID.
    logger.warning(
        "yt-dlp failed video_id=%s error_type=%s",
        video_id,
        type(exc).__name__,
    )
    # Log the real message at error for operators (still no raw user URL).
    logger.error("yt-dlp detail video_id=%s: %s", video_id, exc)

    if isinstance(exc, (TimeoutError, OSError)) or "timed out" in text or "timeout" in text:
        return YoutubeServiceError(
            "youtube_unreachable",
            "We couldn't reach YouTube, please try again.",
            status_code=504,
        )

    # Live before "unavailable" — yt-dlp often says
    # "This live stream recording is not available."
    if any(
        needle in text
        for needle in (
            "is_live",
            "live event",
            "live stream",
            "premiere",
            "will begin",
            "upcoming",
        )
    ):
        return YoutubeServiceError(
            "video_live",
            "Live streams and premieres that haven't aired yet can't be dubbed.",
        )

    if any(
        needle in text
        for needle in (
            "sign in to confirm your age",
            "age-restricted",
            "age restricted",
            "confirm your age",
            "login required",
            "members-only",
            "members only",
        )
    ):
        return YoutubeServiceError(
            "video_restricted",
            "That video is age-restricted or requires signing in to view.",
        )

    if any(
        needle in text
        for needle in (
            "private video",
            "video unavailable",
            "has been removed",
            "does not exist",
            "not available",
            "unavailable",
        )
    ):
        return YoutubeServiceError(
            "video_unavailable",
            "That video is private, deleted, or unavailable.",
        )

    if isinstance(exc, (DownloadError, ExtractorError)):
        return YoutubeServiceError(
            "extraction_failed",
            "We couldn't read that video's details. Please try again.",
            status_code=502,
        )

    return YoutubeServiceError(
        "extraction_failed",
        "We couldn't read that video's details. Please try again.",
        status_code=502,
    )
