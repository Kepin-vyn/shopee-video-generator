import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Shopee Affiliate Batch Video Generator"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database & Storage
    DATABASE_URL: str = "sqlite:///./shopee_video.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    STORAGE_DIR: str = "./storage"

    # Auth
    SECRET_KEY: str = "super-secret-key-change-in-production-123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    model_config = SettingsConfigDict(
        # Look for .env in backend/ dir first, then project root
        env_file=(
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),  # backend/.env
            os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"),  # project root .env
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
