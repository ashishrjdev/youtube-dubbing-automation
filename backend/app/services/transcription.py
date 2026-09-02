import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class TranscriptionClient:
    def transcribe(self, audio_url: str) -> dict:
        logger.info(
            "transcription stub provider=%s audio_url=%s",
            settings.transcription_provider,
            audio_url,
        )
        raise NotImplementedError
