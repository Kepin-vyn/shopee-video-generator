import os
import shutil
import zipfile
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Batch, BatchImage, Video, Music
from app.schemas.schemas import BatchResponse, BatchImageResponse, GroupingResponse, BatchStatusResponse, VideoResponse
from app.services.render_service import process_batch_render

router = APIRouter(prefix="/batches", tags=["batches"])

@router.get("", response_model=List[BatchResponse])
def list_batches(db: Session = Depends(get_db)):
    """List all video generation batches."""
    return db.query(Batch).order_by(Batch.created_at.desc()).all()

@router.post("", response_model=BatchResponse)
def create_batch(name: str = "Shopee Batch", db: Session = Depends(get_db)):
    """Create a new batch."""
    batch = Batch(name=name, user_id="demo-user-id")
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch

@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    """Get single batch details."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch

@router.post("/{batch_id}/images")
async def upload_batch_images(
    batch_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Upload screenshots for a batch."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch_dir = os.path.join(settings.STORAGE_DIR, "uploads", batch_id)
    os.makedirs(batch_dir, exist_ok=True)

    uploaded_count = 0
    current_seq = db.query(BatchImage).filter(BatchImage.batch_id == batch_id).count()

    for file in files:
        current_seq += 1
        file_path = os.path.join(batch_dir, f"{current_seq:03d}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Image type rule: Image 1, 5, 9... (position % 4 == 1) is product, others are review
        img_type = "product" if (current_seq - 1) % 4 == 0 else "review"

        batch_img = BatchImage(
            batch_id=batch_id,
            sequence=current_seq,
            original_filename=file.filename,
            storage_path=file_path,
            image_type=img_type
        )
        db.add(batch_img)
        uploaded_count += 1

    batch.total_images = current_seq
    batch.total_videos = current_seq // 4
    db.commit()

    return {"batch_id": batch_id, "uploaded": uploaded_count, "total_images": current_seq, "total_videos": batch.total_videos}

@router.post("/{batch_id}/group", response_model=GroupingResponse)
def compute_grouping(batch_id: str, db: Session = Depends(get_db)):
    """Compute 4-screenshot auto grouping per video."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    images = db.query(BatchImage).filter(BatchImage.batch_id == batch_id).order_by(BatchImage.sequence).all()
    total_images = len(images)
    complete_videos = total_images // 4
    leftover = total_images % 4

    groups = []
    for v_idx in range(complete_videos):
        video_seq = v_idx + 1
        v_images = images[v_idx*4 : (v_idx+1)*4]
        groups.append({
            "video_sequence": video_seq,
            "image_ids": [img.id for img in v_images],
            "images": [BatchImageResponse.model_validate(img) for img in v_images]
        })

    return {
        "batch_id": batch_id,
        "total_images": total_images,
        "complete_videos": complete_videos,
        "leftover_images": leftover,
        "groups": groups
    }

@router.post("/{batch_id}/generate")
def start_batch_generation(
    batch_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Trigger background video rendering for a batch."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch.total_images < 4:
        raise HTTPException(status_code=400, detail="Batch requires at least 4 screenshots to generate video.")

    batch.status = "processing"
    db.commit()

    background_tasks.add_task(process_batch_render, batch_id)

    return {"message": "Batch video generation started", "batch_id": batch_id, "status": "processing"}

@router.get("/{batch_id}/status", response_model=BatchStatusResponse)
def get_batch_status(batch_id: str, db: Session = Depends(get_db)):
    """Check batch rendering progress status."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    videos = db.query(Video).filter(Video.batch_id == batch_id).all()
    completed = sum(1 for v in videos if v.status == "completed")
    failed = sum(1 for v in videos if v.status == "failed")
    total = len(videos) or batch.total_videos

    progress = int((completed / total) * 100) if total > 0 else 0

    return {
        "batch_id": batch_id,
        "status": batch.status,
        "total_videos": total,
        "completed": completed,
        "failed": failed,
        "progress": progress
    }

@router.get("/{batch_id}/videos", response_model=List[VideoResponse])
def get_batch_videos(batch_id: str, db: Session = Depends(get_db)):
    """Get list of generated videos for a batch."""
    return db.query(Video).filter(Video.batch_id == batch_id).order_by(Video.sequence).all()

@router.get("/{batch_id}/download")
def download_batch_zip(batch_id: str, db: Session = Depends(get_db)):
    """Package and download all rendered videos in batch as a ZIP file."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    videos = db.query(Video).filter(Video.batch_id == batch_id, Video.status == "completed").all()
    if not videos:
        raise HTTPException(status_code=400, detail="No completed videos available for download in this batch.")

    zip_dir = os.path.join(settings.STORAGE_DIR, "downloads")
    os.makedirs(zip_dir, exist_ok=True)
    zip_filename = f"batch_{batch_id[:8]}.zip"
    zip_path = os.path.join(zip_dir, zip_filename)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for vid in videos:
            if vid.output_path and os.path.exists(vid.output_path):
                arcname = f"video_{vid.sequence:03d}.mp4"
                zip_file.write(vid.output_path, arcname=arcname)

    return FileResponse(
        path=zip_path,
        filename=zip_filename,
        media_type="application/zip"
    )

@router.get("/videos/{video_id}/download")
def download_single_video(video_id: str, db: Session = Depends(get_db)):
    """Download single MP4 video file."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or not video.output_path or not os.path.exists(video.output_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(
        path=video.output_path,
        filename=f"video_{video.sequence:03d}.mp4",
        media_type="video/mp4"
    )

@router.delete("/{batch_id}")
def delete_batch(batch_id: str, db: Session = Depends(get_db)):
    """Delete batch and its files."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Clean storage
    for folder in ["uploads", "processed", "output"]:
        path = os.path.join(settings.STORAGE_DIR, folder, batch_id)
        if os.path.exists(path):
            shutil.rmtree(path, ignore_errors=True)

    db.delete(batch)
    db.commit()
    return {"message": f"Batch {batch_id} deleted successfully"}
