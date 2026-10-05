from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def find_project_root(start: Path | None = None) -> Path:
    current = (start or Path.cwd()).resolve()
    for path in [current, *current.parents]:
        if (path / "backend").exists() and (path / "ml").exists():
            return path
    raise FileNotFoundError("Could not find CardioTwin project root.")


class Settings(BaseSettings):
    app_name: str = "Cardio 3D AI"
    backend_host: str = Field(default="127.0.0.1", alias="BACKEND_HOST")
    backend_port: int = Field(default=8000, alias="BACKEND_PORT")
    model_version: str = "1.0.0"
    database_url: str = Field(alias="DATABASE_URL", default="postgresql://postgres:postgres@localhost:5432/cardiodb")
    secret_key: str = Field(alias="SECRET_KEY", default="supersecretkey")
    algorithm: str = Field(alias="ALGORITHM", default="HS256")
    access_token_expire_minutes: int = Field(alias="ACCESS_TOKEN_EXPIRE_MINUTES", default=15)
    refresh_token_expire_days: int = Field(alias="REFRESH_TOKEN_EXPIRE_DAYS", default=7)
    supabase_url: str = Field(alias="SUPABASE_URL", default="https://xyz.supabase.co")
    supabase_service_key: str = Field(alias="SUPABASE_SERVICE_KEY", default="service-role-key")
    project_root: Path = Field(default_factory=find_project_root)
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        alias="CORS_ORIGINS",
    )
    
    # AI Risk Story
    gemini_api_key: str = Field(alias="GEMINI_API_KEY", default="test_key")
    risk_story_model: str = Field(alias="RISK_STORY_MODEL", default="gemini-3.8-flash")
    risk_story_fallback_models: str = Field(alias="RISK_STORY_FALLBACK_MODELS", default="gemini-3.5-flash")
    risk_story_thinking_level: str = Field(alias="RISK_STORY_THINKING_LEVEL", default="low")
    risk_story_max_output_tokens: int = Field(alias="RISK_STORY_MAX_OUTPUT_TOKENS", default=1200)
    risk_story_timeout_seconds: int = Field(alias="RISK_STORY_TIMEOUT_SECONDS", default=20)
    risk_story_max_factors: int = Field(alias="RISK_STORY_MAX_FACTORS", default=6)
    risk_story_cache_enabled: bool = Field(alias="RISK_STORY_CACHE_ENABLED", default=True)

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
