"""Upload validation for PROJ-02 / SEC-04.

Never trust the client Content-Type or filename alone — extension allowlist
plus ffprobe on the real bytes.
"""

from __future__ import annotations

import json
import logging
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = frozenset({".mp3", ".wav", ".m4a"})
CONTENT_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
}
# Fallback title when sanitization leaves nothing usable.
DEFAULT_UPLOAD_TITLE = "Uploaded audio"
MAX_TITLE_LENGTH = 120
FFPROBE_TIMEOUT_SECONDS = 10
# Chunk size when streaming the upload body to a temp file.
STREAM_CHUNK_SIZE = 64 * 1024


class AudioUploadError(Exception):
    def __init__(self, code: str, message: str, *, status_code: int = 422) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class ProbedAudio:
    duration_seconds: int
    has_audio: bool


def max_upload_bytes() -> int:
    return settings.max_upload_mb * 1024 * 1024


def extension_for_filename(filename: str | None) -> str:
    """Return the lowercased extension (including dot) or raise unsupported_file_type."""
    if not filename or not filename.strip():
        raise AudioUploadError(
            "unsupported_file_type",
            "Upload an MP3, WAV, or M4A file.",
            status_code=415,
        )
    # Path parts only for extension check — never use the raw name in storage paths.
    name = Path(filename.replace("\\", "/")).name
    ext = Path(name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise AudioUploadError(
            "unsupported_file_type",
            "Upload an MP3, WAV, or M4A file.",
            status_code=415,
        )
    return ext


def content_type_for_extension(ext: str) -> str:
    return CONTENT_TYPES[ext]


def sanitize_upload_title(filename: str | None) -> str:
    """Derive a safe project title from the original filename (never used in storage paths)."""
    if not filename:
        return DEFAULT_UPLOAD_TITLE

    # Strip directories / Windows separators; keep only the final path segment.
    name = filename.replace("\x00", "")
    name = Path(name.replace("\\", "/")).name
    # Prefer stripping a known audio extension. Path.stem treats ".mp3" as a
    # hidden file with no extension, which would leave the extension as the title.
    lower = name.lower()
    stem = name
    for ext in ALLOWED_EXTENSIONS:
        if lower.endswith(ext):
            stem = name[: -len(ext)]
            break
    else:
        stem = Path(name).stem

    # Drop control characters; keep printable unicode.
    cleaned = "".join(ch for ch in stem if ch.isprintable() and ord(ch) >= 32)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return DEFAULT_UPLOAD_TITLE
    if len(cleaned) > MAX_TITLE_LENGTH:
        cleaned = cleaned[:MAX_TITLE_LENGTH].rstrip()
    return cleaned or DEFAULT_UPLOAD_TITLE


def source_storage_filename(ext: str) -> str:
    """Canonical object name — never the user's filename."""
    if ext not in ALLOWED_EXTENSIONS:
        raise AudioUploadError(
            "unsupported_file_type",
            "Upload an MP3, WAV, or M4A file.",
            status_code=415,
        )
    return f"source{ext}"


def probe_audio(path: Path) -> ProbedAudio:
    """Run ffprobe; require ≥1 audio stream and a finite duration."""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        "--",
        str(path),
    ]
    try:
        completed = subprocess.run(
            cmd,
            check=False,
            capture_output=True,
            text=True,
            timeout=FFPROBE_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as exc:
        logger.error("ffprobe binary not found")
        raise AudioUploadError(
            "file_corrupt",
            "We couldn't read that audio file. Try a different MP3, WAV, or M4A.",
        ) from exc
    except subprocess.TimeoutExpired as exc:
        logger.warning("ffprobe timed out path=%s", path.name)
        raise AudioUploadError(
            "file_corrupt",
            "We couldn't read that audio file. Try a different MP3, WAV, or M4A.",
        ) from exc

    if completed.returncode != 0:
        logger.info(
            "ffprobe rejected file exit=%s stderr=%s",
            completed.returncode,
            (completed.stderr or "")[:200],
        )
        raise AudioUploadError(
            "file_corrupt",
            "We couldn't read that audio file. Try a different MP3, WAV, or M4A.",
        )

    try:
        payload = json.loads(completed.stdout or "{}")
    except json.JSONDecodeError as exc:
        raise AudioUploadError(
            "file_corrupt",
            "We couldn't read that audio file. Try a different MP3, WAV, or M4A.",
        ) from exc

    streams = payload.get("streams") or []
    has_audio = any(isinstance(s, dict) and s.get("codec_type") == "audio" for s in streams)
    if not has_audio:
        raise AudioUploadError(
            "file_corrupt",
            "We couldn't read that audio file. Try a different MP3, WAV, or M4A.",
        )

    duration_raw = None
    fmt = payload.get("format") or {}
    if isinstance(fmt, dict):
        duration_raw = fmt.get("duration")
    if duration_raw is None:
        for stream in streams:
            if isinstance(stream, dict) and stream.get("codec_type") == "audio":
                duration_raw = stream.get("duration")
                if duration_raw is not None:
                    break

    try:
        duration_seconds = int(float(duration_raw))
    except (TypeError, ValueError) as exc:
        raise AudioUploadError(
            "file_corrupt",
            "We couldn't read that audio file. Try a different MP3, WAV, or M4A.",
        ) from exc

    if duration_seconds <= 0:
        raise AudioUploadError(
            "file_corrupt",
            "We couldn't read that audio file. Try a different MP3, WAV, or M4A.",
        )

    max_seconds = settings.max_video_minutes * 60
    if duration_seconds > max_seconds:
        raise AudioUploadError(
            "audio_too_long",
            f"Audio longer than {settings.max_video_minutes} minutes isn't supported yet.",
        )

    return ProbedAudio(duration_seconds=duration_seconds, has_audio=True)
