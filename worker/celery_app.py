"""
Celery application instance.

Loaded by both the FastAPI backend (to dispatch tasks) and the
Celery worker process (to execute them).
"""
import os
import sys

# Make sure the project root (containing both `backend/` and `worker/`) is on the path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from celery import Celery

# Read broker/backend URLs from environment (set via Docker Compose or .env)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "shopee_video_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["worker.tasks"],   # module containing @celery_app.task definitions
)

celery_app.conf.update(
    # Serialisation
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Time-outs
    task_soft_time_limit=600,   # 10 min soft limit per task
    task_time_limit=720,        # 12 min hard limit

    # Retry & acks
    task_acks_late=True,        # ack only after the task completes (safe with Redis)
    task_reject_on_worker_lost=True,

    # Result expiry (24 h)
    result_expires=86400,

    # Worker concurrency — override via CELERY_CONCURRENCY env var
    worker_concurrency=int(os.getenv("CELERY_CONCURRENCY", "2")),

    # Timezone
    timezone="UTC",
    enable_utc=True,
)
