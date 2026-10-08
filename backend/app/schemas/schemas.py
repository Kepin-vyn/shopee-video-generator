from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Auth
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Batch Images
class BatchImageResponse(BaseModel):
    id: str
    sequence: int
    original_filename: str
    image_type: str
    detection_confidence: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None

    class Config:
        from_attributes = True

# Grouping
class GroupDetail(BaseModel):
    video_sequence: int
    image_ids: List[str]
    images: List[BatchImageResponse]

class GroupingResponse(BaseModel):
    batch_id: str
    total_images: int
    complete_videos: int
    leftover_images: int
    groups: List[GroupDetail]

class GroupUpdateRequest(BaseModel):
    groups: List[dict]

# Batch
class BatchCreate(BaseModel):
    name: Optional[str] = "Shopee Affiliate Batch"
    preset_id: Optional[str] = None

class BatchResponse(BaseModel):
    id: str
    name: Optional[str]
    total_images: int
    total_videos: int
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Videos & Status
class VideoResponse(BaseModel):
    id: str
    sequence: int
    status: str
    music_id: Optional[str] = None
    output_path: Optional[str] = None
    duration_seconds: Optional[float] = 10.0
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class BatchStatusResponse(BaseModel):
    batch_id: str
    status: str
    total_videos: int
    completed: int
    failed: int
    progress: int
    queue_backend: Optional[str] = None  # "celery" or "background"

# Music
class MusicResponse(BaseModel):
    id: str
    original_filename: str
    mime_type: str
    duration_seconds: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True
