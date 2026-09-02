import logging

logger = logging.getLogger(__name__)


class ElevenLabsClient:
    def generate_speech(self, text: str, voice_id: str) -> bytes:
        logger.info("elevenlabs generate_speech stub voice_id=%s chars=%s", voice_id, len(text))
        raise NotImplementedError
