import logging
from typing import Literal, Self

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "staging", "production"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: Environment = "development"
    cors_origins: str = "http://localhost:3000"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    database_url: str = ""
    redis_url: str = ""
    transcription_provider: str = ""
    assemblyai_api_key: str = ""
    deepgram_api_key: str = ""
    openai_api_key: str = ""
    elevenlabs_api_key: str = ""

    @field_validator("environment", mode="before")
    @classmethod
    def normalize_environment(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [part.strip() for part in self.cors_origins.split(",") if part.strip()]

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def log_level(self) -> int:
        return logging.DEBUG if self.is_development else logging.INFO

    @model_validator(mode="after")
    def reject_wildcard_cors_outside_development(self) -> Self:
        if not self.is_development and "*" in self.cors_origin_list:
            raise ValueError("CORS_ORIGINS cannot include '*' unless ENVIRONMENT is development")
        return self


settings = Settings()
