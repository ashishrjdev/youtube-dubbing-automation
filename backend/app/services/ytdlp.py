import logging

logger = logging.getLogger(__name__)


class YtDlpClient:
    def download_audio(self, url: str) -> str:
        logger.info("yt-dlp download_audio stub url=%s", url)
        raise NotImplementedError
