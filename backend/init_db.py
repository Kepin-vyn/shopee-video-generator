"""
Initialize database schema on first startup.
Run: python init_db.py
"""
from app.core.database import Base, engine
from app.models.models import (
    User, Batch, BatchImage, Video, VideoImage, Music, RenderJob, Preset
)

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")
