from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

def _build_url(url: str) -> str:
    """
    Ensure PostgreSQL URLs use the psycopg2 driver.
    SQLAlchemy 2.x defaults to psycopg (v3) for 'postgresql://',
    so we explicitly pin to 'postgresql+psycopg2://'.
    """
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1) \
                  .replace("postgres://", "postgresql+psycopg2://", 1)
    return url

engine = create_engine(
    _build_url(settings.DATABASE_URL),
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
