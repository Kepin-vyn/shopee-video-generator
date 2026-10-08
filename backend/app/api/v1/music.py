import os
import shutil
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.models import Music, User
from app.schemas.schemas import MusicResponse

router = APIRouter(prefix="/music", tags=["music"])

ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/x-m4a"}
MAX_AUDIO_SIZE_MB = 50


@router.post("", response_model=MusicResponse, status_code=201)
def upload_music(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a background music track to the library."""
    # Basic MIME validation
    if file.content_type and file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type: {file.content_type}. Allowed: MP3, WAV, M4A.",
        )

    music_dir = os.path.join(settings.STORAGE_DIR, "music", current_user.id)
    os.makedirs(music_dir, exist_ok=True)

    # Save file
    safe_name = f"{file.filename}"
    file_path = os.path.join(music_dir, safe_name)
    size = 0
    with open(file_path, "wb") as buffer:
        while chunk := file.file.read(1024 * 256):  # 256 KB chunks
            size += len(chunk)
            if size > MAX_AUDIO_SIZE_MB * 1024 * 1024:
                buffer.close()
                os.remove(file_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum allowed size is {MAX_AUDIO_SIZE_MB} MB.",
                )
            buffer.write(chunk)

    music_item = Music(
        user_id=current_user.id,
        original_filename=file.filename,
        storage_path=file_path,
        mime_type=file.content_type or "audio/mpeg",
    )
    db.add(music_item)
    db.commit()
    db.refresh(music_item)
    return music_item


@router.get("", response_model=List[MusicResponse])
def list_music(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's music library."""
    return (
        db.query(Music)
        .filter(Music.user_id == current_user.id)
        .order_by(Music.created_at.desc())
        .all()
    )


@router.get("/{music_id}/preview")
def preview_music(
    music_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stream a music track for in-browser preview."""
    music_item = (
        db.query(Music)
        .filter(Music.id == music_id, Music.user_id == current_user.id)
        .first()
    )
    if not music_item:
        raise HTTPException(status_code=404, detail="Music track not found")

    if not os.path.exists(music_item.storage_path):
        raise HTTPException(status_code=404, detail="Music file not found on disk")

    return FileResponse(
        path=music_item.storage_path,
        media_type=music_item.mime_type,
        filename=music_item.original_filename,
    )


@router.get("/{music_id}/stream")
def stream_music(
    music_id: str,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Stream music using token as query param.
    Allows <audio src="...?token=..."> in browser.
    """
    from app.core.security import decode_access_token
    from app.models.models import User as UserModel

    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    music_item = (
        db.query(Music)
        .filter(Music.id == music_id, Music.user_id == user.id)
        .first()
    )
    if not music_item:
        raise HTTPException(status_code=404, detail="Music track not found")

    if not os.path.exists(music_item.storage_path):
        raise HTTPException(status_code=404, detail="Music file not found on disk")

    return FileResponse(
        path=music_item.storage_path,
        media_type=music_item.mime_type,
        filename=music_item.original_filename,
    )


@router.delete("/{music_id}")
def delete_music(
    music_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a music track from the library (must be owned by current user)."""
    music_item = (
        db.query(Music)
        .filter(Music.id == music_id, Music.user_id == current_user.id)
        .first()
    )
    if not music_item:
        raise HTTPException(status_code=404, detail="Music track not found")

    if os.path.exists(music_item.storage_path):
        os.remove(music_item.storage_path)

    db.delete(music_item)
    db.commit()
    return {"message": "Music track deleted"}
