# Shopee Affiliate Batch Video Generator

Aplikasi web untuk mengubah sekumpulan screenshot produk & review Shopee menjadi video affiliate pendek secara batch otomatis.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy |
| Database | PostgreSQL (dev: SQLite) |
| Queue | Redis + Celery |
| Image Processing | OpenCV + Pillow |
| Video Rendering | FFmpeg |
| Proxy | Nginx |
| Containerization | Docker + Docker Compose |

---

## Cara Menjalankan (Development — Tanpa Docker)

### Prerequisites
- Python 3.11+
- Node.js 20+
- FFmpeg (installed system-wide atau via `imageio-ffmpeg`)

### 1. Setup Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

API docs tersedia di: http://localhost:8000/docs

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

App tersedia di: http://localhost:3000

### 3. (Opsional) Jalankan Celery Worker

> **Catatan:** Jika Redis tidak tersedia, rendering otomatis fallback ke in-process BackgroundTasks.

Pastikan Redis berjalan, lalu:

```bash
# Dari root project
celery -A worker.celery_app.celery_app worker --loglevel=info --concurrency=2
```

---

## Cara Deploy (Production — Docker Compose)

### 1. Clone & konfigurasi environment

```bash
git clone https://github.com/Kepin-vyn/shopee-video-generator.git
cd shopee-video-generator

# Salin dan edit file .env
cp .env.example .env
```

Edit `.env`:
```env
SECRET_KEY=<generate dengan: python -c "import secrets; print(secrets.token_hex(32))">
NEXT_PUBLIC_API_URL=http://yourdomain.com/api/v1
```

### 2. Build & jalankan semua service

```bash
docker compose up -d --build
```

Akses aplikasi di: http://localhost (via Nginx port 80)

### 3. Cek status service

```bash
docker compose ps
docker compose logs -f worker      # lihat render jobs
docker compose logs -f backend     # lihat API logs
```

### 4. Scale worker (opsional)

```bash
docker compose up -d --scale worker=4
```

---

## Services & Ports

| Service | Port | Keterangan |
|---|---|---|
| Nginx | 80 | Reverse proxy (entry point production) |
| Frontend | 3000 | Next.js (direct dev access) |
| Backend API | 8000 | FastAPI (direct dev access) |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Celery broker |

---

## API Endpoints

Base URL: `/api/v1`

### Auth
| Method | Path | Keterangan |
|---|---|---|
| POST | `/auth/register` | Daftar akun baru |
| POST | `/auth/login` | Login, mendapat JWT token |
| GET | `/auth/me` | Info user yang login |

### Batches
| Method | Path | Keterangan |
|---|---|---|
| GET | `/batches` | List semua batch milik user |
| POST | `/batches` | Buat batch baru |
| POST | `/batches/{id}/images` | Upload screenshots |
| POST | `/batches/{id}/group` | Hitung grouping |
| GET | `/batches/{id}/groups` | Lihat grouping |
| PATCH | `/batches/{id}/groups` | Edit urutan grouping |
| POST | `/batches/{id}/generate` | Mulai rendering |
| GET | `/batches/{id}/status` | Cek progress |
| GET | `/batches/{id}/videos` | List video |
| GET | `/batches/{id}/download` | Download ZIP |

### Videos
| Method | Path | Keterangan |
|---|---|---|
| POST | `/batches/videos/{id}/regenerate` | Re-render satu video |
| GET | `/batches/videos/{id}/download` | Download satu MP4 |

### Music
| Method | Path | Keterangan |
|---|---|---|
| POST | `/music` | Upload music |
| GET | `/music` | List music library |
| GET | `/music/{id}/preview` | Preview/stream music |
| DELETE | `/music/{id}` | Hapus music |

---

## Workflow Penggunaan

```
1. Daftar akun → Login
2. Upload Music Library (MP3/WAV/M4A)
3. Buat batch baru → Upload screenshots (berurutan)
4. Cek grouping (4 screenshot = 1 video)
5. Klik Generate → tunggu rendering
6. Download video individual atau Download All as ZIP
7. Upload manual ke Shopee
```

---

## Video Output Specs

| Spec | Value |
|---|---|
| Resolution | 1080 × 1920 |
| Aspect Ratio | 9:16 |
| Duration | ±10 detik |
| Frame Rate | 25 fps |
| Video Codec | H.264 (libx264) |
| Audio Codec | AAC 192k |
| Transition | Slide Left |
| Output Format | MP4 |

---

## Development Notes

- **Auth**: JWT Bearer token, disimpan di `localStorage`
- **Render Queue**: Celery task dengan retry 3x, fallback ke BackgroundTasks jika Redis tidak tersedia
- **Music**: Shuffle without repeat per batch; cycle ulang setelah semua track habis
- **Storage**: File disimpan lokal di `./storage/` (dapat diganti R2/S3 di future)
- **Database**: SQLite untuk dev, PostgreSQL untuk production (auto-detected dari `DATABASE_URL`)
