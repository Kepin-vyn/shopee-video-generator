import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    batches = relationship("Batch", back_populates="user", cascade="all, delete-orphan")
    music = relationship("Music", back_populates="user", cascade="all, delete-orphan")

class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=True)
    total_images = Column(Integer, default=0, nullable=False)
    total_videos = Column(Integer, default=0, nullable=False)
    status = Column(String(30), default="draft", nullable=False) # draft, grouping, processing, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="batches")
    images = relationship("BatchImage", back_populates="batch", cascade="all, delete-orphan", order_by="BatchImage.sequence")
    videos = relationship("Video", back_populates="batch", cascade="all, delete-orphan", order_by="Video.sequence")
    render_jobs = relationship("RenderJob", back_populates="batch", cascade="all, delete-orphan")

class BatchImage(Base):
    __tablename__ = "batch_images"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    sequence = Column(Integer, nullable=False)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(Text, nullable=False)
    image_type = Column(String(20), nullable=False) # product, review
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    processed_path = Column(Text, nullable=True)
    detection_confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    batch = relationship("Batch", back_populates="images")
    __table_args__ = (UniqueConstraint('batch_id', 'sequence', name='_batch_sequence_uc'),)

class Music(Base):
    __tablename__ = "music"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(Text, nullable=False)
    mime_type = Column(String(100), nullable=False)
    duration_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="music")

class Video(Base):
    __tablename__ = "videos"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    sequence = Column(Integer, nullable=False)
    status = Column(String(30), default="pending", nullable=False) # pending, rendering, completed, failed
    music_id = Column(String(36), ForeignKey("music.id", ondelete="SET NULL"), nullable=True)
    output_path = Column(Text, nullable=True)
    duration_seconds = Column(Float, default=10.0, nullable=True)
    width = Column(Integer, default=1080, nullable=True)
    height = Column(Integer, default=1920, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    batch = relationship("Batch", back_populates="videos")
    music = relationship("Music")
    video_images = relationship("VideoImage", back_populates="video", cascade="all, delete-orphan", order_by="VideoImage.position")

class VideoImage(Base):
    __tablename__ = "video_images"

    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True)
    image_id = Column(String(36), ForeignKey("batch_images.id"), nullable=False)
    position = Column(Integer, primary_key=True) # 1, 2, 3, 4

    video = relationship("Video", back_populates="video_images")
    image = relationship("BatchImage")

class RenderJob(Base):
    __tablename__ = "render_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=True)
    status = Column(String(30), default="queued", nullable=False) # queued, processing, completed, failed
    progress = Column(Integer, default=0, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    batch = relationship("Batch", back_populates="render_jobs")

class Preset(Base):
    __tablename__ = "presets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    images_per_video = Column(Integer, default=4, nullable=False)
    duration_seconds = Column(Float, default=10.0, nullable=False)
    width = Column(Integer, default=1080, nullable=False)
    height = Column(Integer, default=1920, nullable=False)
    transition = Column(String(50), default="slide_left", nullable=False)
    music_mode = Column(String(50), default="shuffle_no_repeat", nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
