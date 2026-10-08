"""
Celery tasks for video rendering.

Each task maps 1-to-1 with an existing render_service function so that:
- In production (Redis available): Celery dispatches and executes them.
- In development (no Redis):       FastAPI falls back to BackgroundTasks.
"""
import os
import sys
import logging

# Ensure project root is on sys.path when run as a Celery worker
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from worker.celery_app import celery_app

logger = logging.getLogger("celery.tasks")


@celery_app.task(
    bind=True,
    name="worker.tasks.render_batch",
    max_retries=3,
    default_retry_delay=15,   # seconds between retries
    acks_late=True,
)
def render_batch(self, batch_id: str, video_ids: list = None):
    """
    Celery task: render all (or specific) videos in a batch.

    Args:
        batch_id:  Batch UUID string.
        video_ids: Optional list of Video.id strings to (re-)render.
                   When None, renders every group in the batch.
    """
    try:
        # Import here to avoid circular imports at module load time
        from backend.app.services.render_service import process_batch_render
        process_batch_render(batch_id=batch_id, video_ids=video_ids)
    except Exception as exc:
        logger.error(
            "Task render_batch failed for batch %s (attempt %d/%d): %s",
            batch_id,
            self.request.retries + 1,
            self.max_retries + 1,
            exc,
        )
        # Retry with exponential back-off: 15s → 30s → 60s
        raise self.retry(exc=exc, countdown=15 * (2 ** self.request.retries))
