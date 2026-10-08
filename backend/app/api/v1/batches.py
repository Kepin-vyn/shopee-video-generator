import os
import shutil
import zipfile
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.models import Batch, BatchImage, Video, Music, User
from app.schemas.schemas import (
    BatchResponse, BatchImageResponse, GroupingResponse,
    BatchStatusResponse, VideoResponse,
)
from app.services.task_dispatch import dispatch_render

router = APIRouter(prefix="/batches", tags=["batches"])


def _get_batch_or_404(batch_id: str, user: User, db: Session) -> Batch:
    """Fetch a batch, enforcing ownership."""
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.user_id == user.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


# ─── List / Create ────────────────────────────────────────────────────────────

@router.get("", response_model=List[BatchResponse])
def list_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all batches belonging to the current user."""
    return (
        db.query(Batch)
        .filter(Batch.user_id == current_user.id)
        .order_by(Batch.created_at.desc())
        .all()
    )


@router.post("", response_model=BatchResponse)
def create_batch(
    name: str = "Shopee Batch",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new batch for the current user."""
    batch = Batch(name=name, user_id=current_user.id)
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single batch (must be owned by current user)."""
    return _get_batch_or_404(batch_id, current_user, db)


# ─── Images ───────────────────────────────────────────────────────────────────

@router.post("/{batch_id}/images")
async def upload_batch_images(
    batch_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload screenshots into a batch."""
    batch = _get_batch_or_404(batch_id, current_user, db)

    batch_dir = os.path.join(settings.STORAGE_DIR, "uploads", batch_id)
    os.makedirs(batch_dir, exist_ok=True)

    uploaded_count = 0
    current_seq = db.query(BatchImage).filter(BatchImage.batch_id == batch_id).count()

    for file in files:
        current_seq += 1
        safe_filename = f"{current_seq:03d}_{file.filename}"
        file_path = os.path.join(batch_dir, safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        img_type = "product" if (current_seq - 1) % 4 == 0 else "review"
        batch_img = BatchImage(
            batch_id=batch_id,
            sequence=current_seq,
            original_filename=file.filename,
            storage_path=file_path,
            image_type=img_type,
        )
        db.add(batch_img)
        uploaded_count += 1

    batch.total_images = current_seq
    batch.total_videos = current_seq // 4
    db.commit()

    return {
        "batch_id": batch_id,
        "uploaded": uploaded_count,
        "total_images": current_seq,
        "total_videos": batch.total_videos,
    }


# ─── Grouping ─────────────────────────────────────────────────────────────────

@router.post("/{batch_id}/group", response_model=GroupingResponse)
def compute_grouping(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compute auto-grouping (4 images → 1 video)."""
    _get_batch_or_404(batch_id, current_user, db)

    images = (
        db.query(BatchImage)
        .filter(BatchImage.batch_id == batch_id)
        .order_by(BatchImage.sequence)
        .all()
    )
    total_images = len(images)
    complete_videos = total_images // 4
    leftover = total_images % 4

    groups = []
    for v_idx in range(complete_videos):
        video_seq = v_idx + 1
        v_images = images[v_idx * 4 : (v_idx + 1) * 4]
        groups.append(
            {
                "video_sequence": video_seq,
                "image_ids": [img.id for img in v_images],
                "images": [BatchImageResponse.model_validate(img) for img in v_images],
            }
        )

    return {
        "batch_id": batch_id,
        "total_images": total_images,
        "complete_videos": complete_videos,
        "leftover_images": leftover,
        "groups": groups,
    }


@router.get("/{batch_id}/groups", response_model=GroupingResponse)
def get_groups(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current grouping for a batch (same logic as POST /group)."""
    return compute_grouping(batch_id, db=db, current_user=current_user)


@router.patch("/{batch_id}/groups")
def update_groups(
    batch_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reorder or reassign images within groups.
    Body: { "groups": [{ "video_sequence": 1, "image_ids": ["uuid", ...] }] }
    Each group must have exactly 4 image IDs.
    """
    batch = _get_batch_or_404(batch_id, current_user, db)
    groups = payload.get("groups", [])

    all_image_ids = {
        img.id
        for img in db.query(BatchImage).filter(BatchImage.batch_id == batch_id).all()
    }

    for group in groups:
        image_ids = group.get("image_ids", [])
        if len(image_ids) != 4:
            raise HTTPException(
                status_code=400,
                detail=f"Group {group.get('video_sequence')} must contain exactly 4 images.",
            )
        for img_id in image_ids:
            if img_id not in all_image_ids:
                raise HTTPException(
                    status_code=400,
                    detail=f"Image {img_id} does not belong to this batch.",
                )

    # Re-sequence images according to the new group order
    new_seq = 1
    for group in sorted(groups, key=lambda g: g["video_sequence"]):
        for position, img_id in enumerate(group["image_ids"]):
            img = db.query(BatchImage).filter(BatchImage.id == img_id).first()
            img.sequence = new_seq
            img.image_type = "product" if position == 0 else "review"
            new_seq += 1

    db.commit()
    return {"message": "Groups updated successfully"}


# ─── Generate ─────────────────────────────────────────────────────────────────

@router.post("/{batch_id}/generate")
def start_batch_generation(
    batch_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger background video rendering for the batch."""
    batch = _get_batch_or_404(batch_id, current_user, db)

    if batch.total_images < 4:
        raise HTTPException(
            status_code=400,
            detail="Batch requires at least 4 screenshots to generate a video.",
        )

    batch.status = "processing"
    db.commit()

    dispatch_render(batch_id=batch_id, background_tasks=background_tasks)

    return {
        "message": "Batch video generation started",
        "batch_id": batch_id,
        "status": "processing",
    }


# ─── Status & Videos ──────────────────────────────────────────────────────────

@router.get("/{batch_id}/status", response_model=BatchStatusResponse)
def get_batch_status(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check batch rendering progress."""
    batch = _get_batch_or_404(batch_id, current_user, db)

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
        "progress": progress,
    }


@router.get("/{batch_id}/videos", response_model=List[VideoResponse])
def get_batch_videos(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List generated videos for a batch."""
    _get_batch_or_404(batch_id, current_user, db)
    return (
        db.query(Video)
        .filter(Video.batch_id == batch_id)
        .order_by(Video.sequence)
        .all()
    )


# ─── Regenerate ───────────────────────────────────────────────────────────────

@router.post("/videos/{video_id}/regenerate")
def regenerate_video(
    video_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-render a single failed or completed video."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # ownership check via batch
    batch = _get_batch_or_404(video.batch_id, current_user, db)

    # Reset video status so worker picks it up
    video.status = "pending"
    video.error_message = None
    video.output_path = None
    db.commit()

    dispatch_render(batch_id=batch.id, video_ids=[video_id], background_tasks=background_tasks)

    return {"message": "Video regeneration started", "video_id": video_id}


# ─── Download ─────────────────────────────────────────────────────────────────

@router.get("/{batch_id}/download")
def download_batch_zip(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Package and download all completed videos in batch as ZIP."""
    batch = _get_batch_or_404(batch_id, current_user, db)

    videos = (
        db.query(Video)
        .filter(Video.batch_id == batch_id, Video.status == "completed")
        .all()
    )
    if not videos:
        raise HTTPException(
            status_code=400,
            detail="No completed videos available for download in this batch.",
        )

    zip_dir = os.path.join(settings.STORAGE_DIR, "downloads")
    os.makedirs(zip_dir, exist_ok=True)
    zip_filename = f"batch_{batch_id[:8]}.zip"
    zip_path = os.path.join(zip_dir, zip_filename)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for vid in videos:
            if vid.output_path and os.path.exists(vid.output_path):
                zip_file.write(vid.output_path, arcname=f"video_{vid.sequence:03d}.mp4")

    return FileResponse(path=zip_path, filename=zip_filename, media_type="application/zip")


@router.get("/videos/{video_id}/download")
def download_single_video(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a single MP4 video."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # ownership check
    _get_batch_or_404(video.batch_id, current_user, db)

    if not video.output_path or not os.path.exists(video.output_path):
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    return FileResponse(
        path=video.output_path,
        filename=f"video_{video.sequence:03d}.mp4",
        media_type="video/mp4",
    )


@router.get("/videos/{video_id}/stream")
def stream_single_video(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Stream/download a video using token as query param or Bearer header.
    Allows <video src="...?token=..."> and <a href="...?token=..."> in browser.
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    _get_batch_or_404(video.batch_id, current_user, db)

    if not video.output_path or not os.path.exists(video.output_path):
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    return FileResponse(
        path=video.output_path,
        filename=f"video_{video.sequence:03d}.mp4",
        media_type="video/mp4",
    )


# ─── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/{batch_id}")
def delete_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a batch and its files."""
    batch = _get_batch_or_404(batch_id, current_user, db)

    for folder in ["uploads", "processed", "output"]:
        path = os.path.join(settings.STORAGE_DIR, folder, batch_id)
        if os.path.exists(path):
            shutil.rmtree(path, ignore_errors=True)

    db.delete(batch)
    db.commit()
    return {"message": f"Batch {batch_id} deleted successfully"}
