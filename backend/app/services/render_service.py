import os
import sys
import logging
from datetime import datetime
from sqlalchemy.orm import Session

# Ensure worker package is importable
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from worker.image_processing.product_processor import ProductProcessor
from worker.image_processing.review_processor import ReviewProcessor
from worker.music_processing.audio_engine import MusicEngine
from worker.video_rendering.ffmpeg_renderer import FFmpegRenderer

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import Batch, BatchImage, Video, VideoImage, Music, RenderJob

logger = logging.getLogger("render_service")

def process_batch_render(batch_id: str, video_ids: list = None):
    """
    Background worker: render all (or specific) video groups for a batch.

    Args:
        batch_id:  The batch to render.
        video_ids: Optional list of specific Video.id to (re-)render.
                   When None, renders every group in the batch.
    """
    db: Session = SessionLocal()
    batch = None
    try:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            logger.error(f"Batch {batch_id} not found for rendering")
            return

        # Only change batch status when doing a full batch run, not a single-video regenerate
        is_full_batch = video_ids is None
        if is_full_batch:
            batch.status = "processing"
            db.commit()

        # Fetch all batch images in sequence order
        images = (
            db.query(BatchImage)
            .filter(BatchImage.batch_id == batch_id)
            .order_by(BatchImage.sequence)
            .all()
        )
        total_images = len(images)
        video_count = total_images // 4

        if video_count == 0:
            batch.status = "failed"
            db.commit()
            logger.error(f"Batch {batch_id} has less than 4 images. Cannot render.")
            return

        # Prepare directories
        processed_dir = os.path.join(settings.STORAGE_DIR, "processed", batch_id)
        output_dir = os.path.join(settings.STORAGE_DIR, "output", batch_id)
        os.makedirs(processed_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)

        # Prepare music engine scoped to the batch owner's tracks
        user_music = (
            db.query(Music)
            .filter(Music.user_id == batch.user_id)
            .all()
        )
        music_tracks = [m.storage_path for m in user_music if os.path.exists(m.storage_path)]
        music_engine = MusicEngine(music_tracks) if music_tracks else None

        product_proc = ProductProcessor()
        review_proc = ReviewProcessor()
        renderer = FFmpegRenderer()

        for v_idx in range(video_count):
            video_seq = v_idx + 1
            chunk_images = images[v_idx * 4 : (v_idx + 1) * 4]

            # Resolve existing Video record
            video = (
                db.query(Video)
                .filter(Video.batch_id == batch_id, Video.sequence == video_seq)
                .first()
            )
            if not video:
                video = Video(batch_id=batch_id, sequence=video_seq, status="rendering")
                db.add(video)
                db.commit()
                db.refresh(video)

            # Skip if we're only regenerating specific videos and this isn't one of them
            if video_ids is not None and video.id not in video_ids:
                continue

            video.status = "rendering"
            db.commit()

            processed_paths = []
            try:
                for img_idx, img in enumerate(chunk_images):
                    out_img_name = (
                        f"proc_v{video_seq:03d}_img{img_idx+1}_{os.path.basename(img.storage_path)}"
                    )
                    out_img_path = os.path.join(processed_dir, out_img_name)

                    if img_idx == 0:
                        product_proc.process(img.storage_path, out_img_path)
                    else:
                        review_proc.process(img.storage_path, out_img_path)

                    img.processed_path = out_img_path
                    processed_paths.append(out_img_path)

                selected_music = music_engine.get_next_track() if music_engine else None

                video_filename = f"video_{video_seq:03d}.mp4"
                output_video_path = os.path.join(output_dir, video_filename)

                renderer.render_video(
                    image_paths=processed_paths,
                    output_path=output_video_path,
                    audio_path=selected_music,
                )

                video.status = "completed"
                video.output_path = output_video_path
                video.completed_at = datetime.utcnow()
                db.commit()

            except Exception as ex:
                logger.error(f"Error rendering video {video_seq} in batch {batch_id}: {ex}")
                video.status = "failed"
                video.error_message = str(ex)
                db.commit()

        # Update batch-level completion status (only for full batch runs)
        if is_full_batch:
            all_videos = db.query(Video).filter(Video.batch_id == batch_id).all()
            if all(v.status == "completed" for v in all_videos):
                batch.status = "completed"
            elif any(v.status == "completed" for v in all_videos):
                batch.status = "completed_with_errors"
            else:
                batch.status = "failed"
            batch.completed_at = datetime.utcnow()
            db.commit()

    except Exception as e:
        logger.error(f"Fatal error in process_batch_render for {batch_id}: {e}")
        if batch:
            batch.status = "failed"
            db.commit()
    finally:
        db.close()
