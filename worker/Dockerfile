# ─── Celery Worker Dockerfile ──────────────────────────────────────────────────
# Context: project root (so both `backend/` and `worker/` are accessible)
FROM python:3.11-slim AS base

# System dependencies: FFmpeg (required for rendering), OpenCV, psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libpq-dev \
    gcc \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies from backend requirements
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy project source
COPY backend/app/ ./backend/app/
COPY worker/ ./worker/

# Storage mount point
RUN mkdir -p /app/storage

# Non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser

# Start Celery worker
CMD ["celery", "-A", "worker.celery_app.celery_app", "worker", \
     "--loglevel=info", \
     "--concurrency=2", \
     "--without-heartbeat", \
     "--without-gossip", \
     "--without-mingle"]
