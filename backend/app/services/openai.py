import logging

logger = logging.getLogger(__name__)


class OpenAIClient:
    def rewrite_script(self, lines: list[dict]) -> list[dict]:
        logger.info("openai rewrite_script stub line_count=%s", len(lines))
        raise NotImplementedError
