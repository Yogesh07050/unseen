"""Typed settings from the environment (section 3)."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Load the repo-root .env (when run from server/) first, then a local server/.env override.
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    # Gloo AI Studio. Either a direct API key (bearer) or OAuth2 client credentials.
    gloo_api_key: str | None = None
    gloo_client_id: str | None = None
    gloo_client_secret: str | None = None
    gloo_model_fast: str = "gloo-anthropic-claude-haiku-4.5"

    # OpenAI Whisper speech-to-text and server-generated read-aloud audio.
    openai_api_key: str | None = None
    openai_speech_model: str = "gpt-4o-mini-tts"
    openai_speech_voice: str = "sage"
    max_audio_size_mb: int = 25

    # YouVersion Platform (optional: when unset the bundled public-domain BSB text is served).
    yvp_app_key: str | None = None

    default_bible_id: int = 3034
    redis_url: str | None = None
    # PostgreSQL (asyncpg DSN). Optional: unset = prayer links stay in Redis/memory
    # and the Truth Index is served from the bundled JSON, so the keyless demo runs.
    database_url: str | None = None
    app_base_url: str = "http://localhost:8000"
    # Origins allowed to call /api cross-origin. The browser PWA is same-origin
    # and needs none; the native Android shell (Capacitor) serves the UI from
    # its own origin and must be listed. Comma-separated.
    cors_origins: str = "https://localhost,capacitor://localhost,http://localhost"
    static_dir: str = "static"
    env: str = "development"
    log_level: str = "info"

    @property
    def gloo_enabled(self) -> bool:
        return bool(self.gloo_api_key or (self.gloo_client_id and self.gloo_client_secret))

    @property
    def youversion_enabled(self) -> bool:
        return bool(self.yvp_app_key)

    @property
    def openai_enabled(self) -> bool:
        return bool(self.openai_api_key)


settings = Settings()
