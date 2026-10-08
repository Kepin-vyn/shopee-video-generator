import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Shopee Affiliate Batch Video Generator"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database & Storage
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./shopee_video.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "./storage")

    # Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production-123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    class Config:
        case_sensitive = True

settings = Settings()
