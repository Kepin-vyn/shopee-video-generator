# 📋 Progress Report — Shopee Affiliate Batch Video Generator

**Tanggal Update:** 8 Oktober 2026  
**Repository:** [github.com/Kepin-vyn/shopee-video-generator](https://github.com/Kepin-vyn/shopee-video-generator)  
**Branch:** `main`  
**Author:** Kepin-vyn \<cevyndapatalu14@gmail.com\>

---

## ✅ Yang Sudah Selesai

### 1. Backend — FastAPI (Python)

| File | Status | Keterangan |
|------|--------|------------|
| `backend/app/main.py` | ✅ Done | App entry point, CORS middleware, router registration (auth + batches + music) |
| `backend/app/core/config.py` | ✅ Done | Settings via pydantic-settings, auto-load `.env` file |
| `backend/app/core/database.py` | ✅ Done | SQLAlchemy engine, psycopg2 URL fix, session factory, `get_db` dependency |
| `backend/app/core/security.py` | ✅ Done | bcrypt password hashing (direct, tanpa passlib), JWT sign/verify |
| `backend/app/core/deps.py` | ✅ Done | `get_current_user` — support token dari Bearer header **dan** `?token=` query param |
| `backend/app/models/models.py` | ✅ Done | 8 tabel: User, Batch, BatchImage, Music, Video, VideoImage, RenderJob, Preset |
| `backend/app/schemas/schemas.py` | ✅ Done | Pydantic schemas semua response & request, termasuk Token, UserResponse |
| `backend/app/api/v1/auth.py` | ✅ Done | POST /auth/register, POST /auth/login, GET /auth/me |
| `backend/app/api/v1/batches.py` | ✅ Done | 13 endpoint lengkap (lihat di bawah) |
| `backend/app/api/v1/music.py` | ✅ Done | 5 endpoint: upload, list, preview, stream, delete |
| `backend/app/services/render_service.py` | ✅ Done | Background render worker, support `video_ids` untuk regenerate |
| `backend/app/services/task_dispatch.py` | ✅ Done | Smart dispatcher: Celery jika Redis tersedia, fallback ke BackgroundTasks |
| `backend/requirements.txt` | ✅ Done | Semua dependensi, bcrypt==4.0.1 pinned |
| `backend/Dockerfile` | ✅ Done | Multi-stage build, FFmpeg included, non-root user |
| `backend/init_db.py` | ✅ Done | Script inisialisasi tabel database |

#### API Endpoints yang Tersedia (`/api/v1`):

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| `POST` | `/auth/register` | ❌ | Daftar akun baru |
| `POST` | `/auth/login` | ❌ | Login, dapat JWT token |
| `GET` | `/auth/me` | ✅ | Info user yang sedang login |
| `GET` | `/batches` | ✅ | List batch milik user |
| `POST` | `/batches` | ✅ | Buat batch baru |
| `GET` | `/batches/{id}` | ✅ | Detail batch |
| `DELETE` | `/batches/{id}` | ✅ | Hapus batch beserta file |
| `POST` | `/batches/{id}/images` | ✅ | Upload screenshots ke batch |
| `POST` | `/batches/{id}/group` | ✅ | Hitung pengelompokan 4 gambar/video |
| `GET` | `/batches/{id}/groups` | ✅ | Lihat grouping |
| `PATCH` | `/batches/{id}/groups` | ✅ | Edit urutan grouping |
| `POST` | `/batches/{id}/generate` | ✅ | Mulai render batch |
| `GET` | `/batches/{id}/status` | ✅ | Cek progress rendering |
| `GET` | `/batches/{id}/videos` | ✅ | List video dalam batch |
| `GET` | `/batches/{id}/download` | ✅ | Download ZIP (Bearer atau `?token=`) |
| `GET` | `/batches/videos/{id}/download` | ✅ | Download satu MP4 |
| `GET` | `/batches/videos/{id}/stream` | ✅ | Stream video (Bearer atau `?token=`) |
| `POST` | `/batches/videos/{id}/regenerate` | ✅ | Re-render satu video |
| `POST` | `/music` | ✅ | Upload musik BGM |
| `GET` | `/music` | ✅ | List music library |
| `GET` | `/music/{id}/preview` | ✅ | Preview musik (Bearer) |
| `GET` | `/music/{id}/stream` | ✅ | Stream musik (Bearer atau `?token=`) |
| `DELETE` | `/music/{id}` | ✅ | Hapus track |

---

### 2. Worker — Image & Video Processing (Python)

| File | Status | Keterangan |
|------|--------|------------|
| `worker/__init__.py` | ✅ Done | Package marker |
| `worker/image_processing/__init__.py` | ✅ Done | Package marker |
| `worker/image_processing/product_processor.py` | ✅ Done | Crop nav/status bar, deteksi warna bg adaptif, center di canvas 1080×1920 |
| `worker/image_processing/review_processor.py` | ✅ Done | Letterbox fit screenshot review ke canvas 1080×1920 dengan bg adaptif |
| `worker/music_processing/__init__.py` | ✅ Done | Package marker |
| `worker/music_processing/audio_engine.py` | ✅ Done | Shuffle tanpa repeat, cycle ulang setelah semua track habis |
| `worker/video_rendering/__init__.py` | ✅ Done | Package marker |
| `worker/video_rendering/ffmpeg_renderer.py` | ✅ Done | 2-step render: still → clip → xfade slideleft, yuv420p fix, CRF 23, cleanup temp |
| `worker/celery_app.py` | ✅ Done | Celery instance, Redis broker, configurable concurrency, soft/hard timeout |
| `worker/tasks.py` | ✅ Done | `render_batch` Celery task, max_retries=3, exponential backoff |
| `worker/run_worker.py` | ✅ Done | Script startup Celery worker |
| `worker/Dockerfile` | ✅ Done | Context dari project root, FFmpeg included, non-root user |

#### Pipeline Render (per video):
```
BatchImage (4 gambar)
    ↓
ProductProcessor (gambar #1: crop UI + center + adaptive bg)
ReviewProcessor  (gambar #2,3,4: letterbox fit + adaptive bg)
    ↓
FFmpegRenderer._make_clip() × 4
(Still JPEG → constant-fps H.264 clip @ 25fps, 3s each)
    ↓
FFmpegRenderer xfade slideleft chain
+ MusicEngine.get_next_track() (shuffle no-repeat)
    ↓
Output: video_001.mp4 (±10 detik, 1080×1920, H.264/AAC)
```

**Render verified:**
- Resolution: 1080×1920 (9:16) ✅
- Duration: ±9.76 detik ✅
- Codec: H.264 + AAC 192k ✅
- Format: MP4 ✅
- Size: ~700 KB per video ✅

---

### 3. Frontend — Next.js 16 (TypeScript)

| File | Status | Keterangan |
|------|--------|------------|
| `frontend/src/app/layout.tsx` | ✅ Done | Root layout, import NavBar, suppressHydrationWarning |
| `frontend/src/app/globals.css` | ✅ Done | Design system: glass-card, gradient-primary, dark theme |
| `frontend/src/app/NavBar.tsx` | ✅ Done | Navbar client component, active link, logout button, hide di auth pages |
| `frontend/src/app/page.tsx` | ✅ Done | Dashboard utama: upload → grouping → generate → download |
| `frontend/src/app/login/page.tsx` | ✅ Done | Halaman login dengan form dan redirect |
| `frontend/src/app/register/page.tsx` | ✅ Done | Halaman register dengan validasi password |
| `frontend/src/app/history/page.tsx` | ✅ Done | Riwayat batch, fetch dari API, status badge, download ZIP |
| `frontend/src/app/music/page.tsx` | ✅ Done | Music library, upload/delete/preview audio langsung di browser |
| `frontend/src/app/settings/page.tsx` | ✅ Done | Tampilan preset default (readonly) |
| `frontend/src/lib/api.ts` | ✅ Done | Typed API client, auto-inject JWT, auto-redirect 401, stream URLs |
| `frontend/src/lib/useAuth.ts` | ✅ Done | Auth hook SSR-safe (loading mulai false, tidak trigger hydration mismatch) |
| `frontend/Dockerfile` | ✅ Done | Multi-stage build, Next.js standalone output |
| `frontend/next.config.ts` | ✅ Done | `output: "standalone"` untuk Docker |

#### Fitur Frontend yang Aktif:
- Login / Register dengan JWT
- Navbar dengan active state, logout button
- Drag & drop / file picker multi-screenshot
- Preview grouping 4 gambar per video (thumbnail grid)
- Grouping reorder dengan tombol ↑ ↓
- Warning jika jumlah gambar tidak genap 4
- Tombol Generate Videos → memanggil API backend
- Progress bar real-time (polling `/status` setiap 1.5 detik)
- Deteksi terminal status: `completed`, `completed_with_errors`, `failed`
- **Video preview** dengan HTML5 `<video>` player native
- **Download MP4** per video dengan token di query param
- **Regenerate** per video yang gagal atau selesai
- **Download All as ZIP** untuk batch
- Music Library: upload / delete / preview audio langsung
- History: list batch dari API, status badge, download ZIP
- Render failed UI dengan detail error

---

### 4. Deployment — Docker & Infrastruktur

| File | Status | Keterangan |
|------|--------|------------|
| `docker-compose.yml` | ✅ Done | 6 services: PostgreSQL, Redis, Backend, Worker, Frontend, Nginx |
| `docker-compose.dev.yml` | ✅ Done | Override untuk development dengan hot-reload |
| `.dockerignore` | ✅ Done | Root level ignore untuk worker Dockerfile context |
| `infra/nginx/nginx.conf` | ✅ Done | Reverse proxy, rate limiting upload, static asset caching |
| `.env.example` | ✅ Done | Template semua environment variable yang dibutuhkan |

#### Services Docker:
| Service | Image | Port |
|---------|-------|------|
| nginx | nginx:1.27-alpine | 80 |
| frontend | custom | 3000 |
| backend | custom | 8000 |
| worker | custom | — |
| db | postgres:16-alpine | 5432 |
| redis | redis:7-alpine | 6379 |

---

### 5. Git & Repository

| Item | Status |
|------|--------|
| Root `.gitignore` | ✅ Done (`.env` excluded) |
| Git init di root project | ✅ Done |
| Local git config | ✅ Kepin-vyn \<cevyndapatalu14@gmail.com\> |
| Push ke GitHub | ✅ github.com/Kepin-vyn/shopee-video-generator |

#### Commit History:
```
ab7cfd3  fix: Support token query param for video/music/zip download endpoints
fbc9cfe  feat: Complete MVP implementation
7930df3  Fix: FFmpegRenderer 2-step rendering
6c54eff  Fix: React hydration, video polling, render error UI
a051f13  Add email-validator dependency
d9ad1cf  Complete Shopee Video Generator MVP implementation
```

---

## 🐛 Bug yang Sudah Diperbaiki

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Backend 500 saat generate | Dua proses uvicorn berjalan bersamaan di port 8000 (akibat `--reload` crash di Windows Python 3.13) | Jalankan uvicorn tanpa `--reload`, gunakan `--workers 1` |
| Video/music tidak bisa dipreview | `<video src>` dan `<audio src>` tidak bisa kirim Authorization header | Tambah endpoint `/stream?token=` dan update `get_current_user` untuk baca token dari query param |
| ZIP download 401 | Endpoint ZIP hanya terima Bearer header, bukan query param | Refactor `get_current_user` di `deps.py` |
| Hydration mismatch | `useAuth` set `loading=true` di server (SSR), mismatch dengan client | Ubah initial state `loading=false`, set `true` hanya di `useEffect` |
| Upload closure bug | `batchId` di-capture saat null di dalam closure `setLocalFiles` | Capture `currentBatchId` sebelum `setState`, pass sebagai parameter eksplisit |
| bcrypt/passlib 500 di container | `passlib` tidak kompatibel dengan `bcrypt>=4` di Python 3.11 | Ganti ke `bcrypt` langsung, hapus passlib |
| psycopg driver error di Docker | SQLAlchemy 2.x default ke `psycopg` (v3), tapi yang terinstall `psycopg2` | Tambah `_build_url()` di `database.py` untuk inject `+psycopg2` ke URL |
| Config tidak baca `.env` | `pydantic-settings` perlu `env_file` dikonfigurasi eksplisit | Update `config.py` dengan `model_config = SettingsConfigDict(env_file=...)` |

---

## 🚀 Cara Menjalankan (Development)

### Prerequisites
- Python 3.11+
- Node.js 20+
- FFmpeg (via `imageio-ffmpeg` atau system-wide)

### Backend
```powershell
cd c:\shopee_video_generator\backend
python -m uvicorn app.main:app --port 8000 --host 0.0.0.0 --workers 1
```
→ API Docs: http://localhost:8000/docs

### Frontend
```powershell
cd c:\shopee_video_generator\frontend
npm run dev
```
→ Aplikasi: http://localhost:3000

> ⚠️ **Jangan gunakan `--reload`** di Windows Python 3.13 — menyebabkan dua proses uvicorn berjalan bersamaan di port yang sama.

---

## 🐳 Cara Deploy (Docker)

```powershell
cd c:\shopee_video_generator
cp .env.example .env
# Edit .env: set SECRET_KEY dan NEXT_PUBLIC_API_URL

docker compose up -d --build
```

→ Akses di http://localhost (via Nginx)

---

## ⏭️ Next Steps (Opsional / Future)

- [ ] Alembic migration untuk schema versioning
- [ ] Celery Flower untuk monitoring render queue
- [ ] Preview video thumbnail di grouping card
- [ ] Batch regenerate (regenerate semua video yang gagal sekaligus)
- [ ] Upload dari folder (directory picker)
- [ ] Custom preset (durasi, jumlah gambar)
- [ ] Deploy ke cloud (Railway / Render / VPS)
- [ ] File retention & cleanup otomatis (30 hari)
- [ ] Rate limiting per user di endpoint upload
