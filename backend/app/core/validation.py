import re
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

MAX_NAME_LENGTH = 100
MAX_SCRIPT_TEXT_LENGTH = 5_000
MAX_SOURCE_REF_LENGTH = 1_024
MAX_URL_LENGTH = 2_048


class RequestModel(BaseModel):
    """Base for request bodies: unknown fields are rejected instead of ignored."""

    model_config = ConfigDict(extra="forbid")


# Stripped before length checks, so whitespace-only input fails min_length=1.
Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_NAME_LENGTH)
]
ScriptText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_SCRIPT_TEXT_LENGTH),
]
# Rewritten text may legitimately be empty until the rewrite step has run.
DraftScriptText = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=MAX_SCRIPT_TEXT_LENGTH)
]
SourceRef = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_SOURCE_REF_LENGTH),
]
ElevenLabsVoiceId = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9]{1,64}$")]

_VIDEO_ID = r"[A-Za-z0-9_-]{11}"
_TAIL = r"(?:[?&#][^\s]*)?"
YOUTUBE_URL_RE = re.compile(
    r"(?:https?://)?"
    r"(?:"
    rf"(?:www\.|m\.|music\.)?youtube\.com/watch\?(?:[^#\s]*&)?v={_VIDEO_ID}(?:[&#][^\s]*)?"
    rf"|(?:www\.|m\.)?youtube\.com/(?:shorts|live|embed)/{_VIDEO_ID}{_TAIL}"
    rf"|youtu\.be/{_VIDEO_ID}{_TAIL}"
    r")",
    re.IGNORECASE,
)


def validate_youtube_url(value: str) -> str:
    if len(value) > MAX_URL_LENGTH or not YOUTUBE_URL_RE.fullmatch(value):
        raise ValueError(
            "must be a YouTube video URL (youtube.com/watch?v=..., youtu.be/..., "
            "or youtube.com/shorts/...)"
        )
    return value
