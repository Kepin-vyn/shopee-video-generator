# ─── Stage 1: Base ────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

# System dependencies for OpenCV, Pillow, psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libpq-dev \
    gcc \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ─── Stage 2: Dependencies ────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── Stage 3: Production ──────────────────────────────────────────────────────
FROM deps AS production
WORKDIR /app

# Copy app source
COPY app/ ./app/

# Storage volume mount point
RUN mkdir -p /app/storage/uploads /app/storage/processed /app/storage/output /app/storage/music /app/storage/downloads

# Non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
