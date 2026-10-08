import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import Music
from app.schemas.schemas import MusicResponse

router = APIRouter(prefix="/music", tags=["music"])

@router.post("", response_model=MusicResponse)
def upload_music(file: UploadFile = File(...), db: Session = Depends(get_db)):
    music_dir = os.path.join(settings.STORAGE_DIR, "music")
    os.makedirs(music_dir, exist_ok=True)

    file_path = os.path.join(music_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    music_item = Music(
        user_id="demo-user-id",
        original_filename=file.filename,
        storage_path=file_path,
        mime_type=file.content_type or "audio/mpeg",
        duration_seconds=10.0
    )
    db.add(music_item)
    db.commit()
    db.refresh(music_item)
    return music_item

@router.get("", response_model=List[MusicResponse])
def list_music(db: Session = Depends(get_db)):
    return db.query(Music).all()

@router.delete("/{music_id}")
def delete_music(music_id: str, db: Session = Depends(get_db)):
    music_item = db.query(Music).filter(Music.id == music_id).first()
    if not music_item:
        raise HTTPException(status_code=404, detail="Music track not found")

    if os.path.exists(music_item.storage_path):
        os.remove(music_item.storage_path)

    db.delete(music_item)
    db.commit()
    return {"message": "Music track deleted"}
