"""
Convenience script to start the Celery worker from the project root.

Usage:
    python worker/run_worker.py

Or directly via Celery CLI (from project root):
    celery -A worker.celery_app.celery_app worker --loglevel=info --concurrency=2
"""
import os
import sys

# Ensure project root is on path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from worker.celery_app import celery_app

if __name__ == "__main__":
    celery_app.worker_main(
        argv=[
            "worker",
            "--loglevel=info",
            f"--concurrency={os.getenv('CELERY_CONCURRENCY', '2')}",
            "--without-heartbeat",   # reduce Redis overhead in dev
            "--without-gossip",
            "--without-mingle",
        ]
    )
