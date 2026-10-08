"""
Task dispatcher — abstracts Celery vs BackgroundTasks.

Usage in route handlers:

    from app.services.task_dispatch import dispatch_render

    @router.post("/{batch_id}/generate")
    def generate(batch_id, bg: BackgroundTasks, ...):
        dispatch_render(batch_id, background_tasks=bg)

When Redis/Celery is reachable, the task is sent to the Celery queue.
When Redis is unavailable (local dev), the task runs in-process via
FastAPI BackgroundTasks with a warning log.
"""
import logging
from typing import Optional, List
from fastapi import BackgroundTasks

logger = logging.getLogger("task_dispatch")

# ── detect Celery availability at module import time ──────────────────────────

_celery_available: Optional[bool] = None   # None = not yet checked


def _check_celery() -> bool:
    global _celery_available
    if _celery_available is not None:
        return _celery_available
    try:
        import sys, os
        ROOT = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..")
        )
        if ROOT not in sys.path:
            sys.path.insert(0, ROOT)

        from worker.celery_app import celery_app
        # Quick connectivity probe (timeout 1 s)
        celery_app.backend.client.ping()
        _celery_available = True
        logger.info("Celery/Redis detected — tasks will be queued via Celery.")
    except Exception as e:
        _celery_available = False
        logger.warning(
            "Celery/Redis not reachable (%s). "
            "Falling back to in-process BackgroundTasks.",
            e,
        )
    return _celery_available


# ── public API ────────────────────────────────────────────────────────────────

def dispatch_render(
    batch_id: str,
    video_ids: List[str] = None,
    background_tasks: BackgroundTasks = None,
) -> str:
    """
    Dispatch a render job.

    Returns "celery" or "background" to indicate which path was used.
    """
    if _check_celery():
        try:
            import sys, os
            ROOT = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "..", "..")
            )
            if ROOT not in sys.path:
                sys.path.insert(0, ROOT)

            from worker.tasks import render_batch
            render_batch.delay(batch_id=batch_id, video_ids=video_ids)
            logger.info("Dispatched render_batch to Celery for batch %s", batch_id)
            return "celery"
        except Exception as e:
            logger.error(
                "Failed to dispatch to Celery (%s). Falling back to BackgroundTasks.", e
            )

    # Fallback — run in-process
    if background_tasks is None:
        # Called outside a request context (e.g. tests) — run synchronously
        from app.services.render_service import process_batch_render
        process_batch_render(batch_id=batch_id, video_ids=video_ids)
    else:
        from app.services.render_service import process_batch_render
        background_tasks.add_task(
            process_batch_render,
            batch_id=batch_id,
            video_ids=video_ids,
        )
    return "background"
