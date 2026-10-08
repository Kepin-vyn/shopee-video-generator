# PRD — Shopee Affiliate Batch Video Generator

**Version:** 1.0  
**Status:** Product Requirements  
**Platform:** Web Application

---

## 1. Product Summary

Shopee Affiliate Batch Video Generator adalah aplikasi web untuk mengubah sekumpulan screenshot produk dan review menjadi video affiliate secara otomatis.

Prinsip utama:

> **User menyiapkan bahan; sistem mengerjakan editing dan rendering.**

Aplikasi berfokus pada batch generation, bukan menjadi full video editor.

Core workflow:

```text
Upload screenshots
      ↓
Auto grouping
      ↓
Preview
      ↓
Generate
      ↓
Server-side rendering
      ↓
Download ZIP
      ↓
Upload manual ke Shopee
```

---

# 2. Problem Statement

Proses pembuatan video affiliate secara manual membutuhkan pekerjaan berulang:

```text
Screenshot produk
↓
3 screenshot review
↓
Masukkan 4 gambar ke editor
↓
Atur durasi
↓
Atur transition
↓
Masukkan music
↓
Export
```

Ketika jumlah produk banyak, proses ini menjadi tidak efisien.

Masalah yang ingin diselesaikan:

1. Editing dilakukan satu per satu.
2. User harus memasukkan gambar secara manual.
3. Setting video harus diulang.
4. Music harus dipilih berulang.
5. Screenshot produk masih mengandung UI yang tidak diperlukan.
6. Export dilakukan berkali-kali.
7. Tidak ada workflow batch sederhana.

---

# 3. Product Goal

Tujuan produk adalah mengurangi pekerjaan manual dalam membuat banyak video affiliate.

Contoh:

```text
80 screenshots
      ↓
Upload
      ↓
Auto grouping
      ↓
Check
      ↓
Generate
      ↓
20 videos
      ↓
Download ZIP
```

User tetap:

- mencari produk sendiri,
- mengambil screenshot sendiri,
- menentukan bahan yang digunakan,
- mengupload hasil video ke Shopee secara manual.

Sistem menangani pekerjaan editing dan rendering yang repetitif.

---

# 4. Target User

## Primary User

Affiliate creator yang:

- membuat banyak video affiliate,
- menggunakan screenshot produk dan review,
- membutuhkan video pendek,
- menginginkan workflow cepat,
- tidak ingin mengedit video satu per satu.

## User Mental Model

User seharusnya berpikir:

> "Saya punya bahan screenshot. Tinggal masukkan, cek, lalu jadi."

Bukan:

> "Saya harus belajar menggunakan video editor."

---

# 5. Product Principles

### 5.1 Default First

Setting umum sudah ditentukan oleh preset default.

### 5.2 Batch First

Satu tindakan dapat menghasilkan banyak video.

### 5.3 Automation First

Pekerjaan repetitif dikerjakan sistem.

### 5.4 Preview Before Render

User dapat memastikan grouping sebelum rendering.

### 5.5 Simple by Design

Tidak menyediakan fitur editor yang tidak diperlukan.

### 5.6 User Controls the Material

Sistem tidak mencari produk atau review secara otomatis. User menyediakan materialnya.

---

# 6. Core User Journey

```text
Create
  ↓
Upload
  ↓
Grouping
  ↓
Preview
  ↓
Generate
  ↓
Rendering
  ↓
Results
  ↓
Download
```

Normal workflow seharusnya hanya membutuhkan:

1. Drag & drop screenshots.
2. Cek grouping.
3. Klik Generate.
4. Download hasil.

---

# 7. Input Model

System membaca image berdasarkan urutan.

Contoh:

```text
01.png
02.png
03.png
04.png
05.png
06.png
07.png
08.png
```

Menjadi:

```text
Video 01 → 01, 02, 03, 04
Video 02 → 05, 06, 07, 08
```

Tidak menggunakan folder per produk.

## Image role

Dalam setiap grup:

```text
Image 1 → Product screenshot
Image 2 → Review screenshot
Image 3 → Review screenshot
Image 4 → Review screenshot
```

---

# 8. Grouping Requirements

System harus:

- membaca urutan file,
- membuat grup berisi 4 image,
- menandai image pertama sebagai product,
- menandai image 2–4 sebagai review,
- menampilkan preview grouping.

Jika jumlah image tidak habis dibagi 4:

```text
14 images
↓
3 complete videos
2 leftover images
```

System tidak membuat incomplete video.

---

# 9. Grouping Preview

Preview menampilkan struktur batch:

```text
20 Videos Detected

Video 01
[1] [2] [3] [4]

Video 02
[5] [6] [7] [8]

Video 03
[9] [10] [11] [12]
```

User dapat:

- melihat grouping,
- reorder image,
- replace image,
- remove image.

Editing grouping bersifat optional.

---

# 10. Default Video Template

## Shopee Affiliate — Basic Slide 10s

| Setting | Value |
|---|---|
| Images per video | 4 |
| Duration | ±10 seconds |
| Aspect ratio | 9:16 |
| Resolution | 1080×1920 |
| Transition | Horizontal Slide Left |
| Audio | Auto Shuffle |
| Output | MP4 |

User tidak perlu mengatur setting tersebut setiap kali.

---

# 11. Product Screenshot Processing

Image pertama diproses sebagai product screenshot.

Pipeline:

```text
Product Screenshot
       ↓
Screenshot Analysis
       ↓
Detect Product Display Area
       ↓
Remove Unwanted UI
       ↓
Crop + Padding
       ↓
Detect Background
       ↓
Create Adaptive Background
       ↓
Auto Position
       ↓
Product Showcase
```

## Requirements

System harus berusaha:

- mendeteksi area product image,
- menghilangkan status/navigation/UI yang tidak diperlukan,
- mempertahankan produk,
- menghindari fixed crop berdasarkan satu ukuran screenshot,
- menyesuaikan background dengan image asli,
- menghasilkan confidence score.

Jika confidence rendah:

```text
⚠️ We couldn't confidently detect the product image.

[Adjust Crop]
```

---

# 12. Adaptive Background

MVP menggunakan dominant/adaptive solid background.

Contoh:

```text
Product background = white
            ↓
Video canvas background = white
```

Tujuannya menghindari:

- black bars,
- tampilan screenshot mentah,
- background yang tidak cocok.

Blurred background dapat dipertimbangkan pada versi berikutnya.

---

# 13. Review Screenshot Processing

Review screenshot harus diproses seminimal mungkin.

Pipeline:

```text
Review Screenshot
      ↓
Resize
      ↓
Fit to 9:16
```

Informasi penting harus tetap terlihat:

- username,
- rating,
- review text,
- foto review,
- informasi produk yang relevan.

Tidak menggunakan aggressive crop jika berpotensi menghilangkan konten.

---

# 14. Video Composition

Video menggunakan 4 scene.

Konsep timeline:

```text
0s              2.5s             5s             7.5s            10s
│────────────────│────────────────│────────────────│────────────────│
   Image 1          Image 2          Image 3          Image 4
```

Transition:

```text
Image 1 → Image 2 → Image 3 → Image 4
```

Tidak menggunakan:

- zoom,
- shake,
- fade,
- Ken Burns,
- sticker,
- text animation.

Durasi transition menjadi parameter internal preset.

---

# 15. Music System

User dapat membuat Music Library sendiri.

Supported format MVP:

- MP3
- WAV
- M4A

Music Library menyediakan:

- upload,
- preview,
- delete.

Untuk batch:

```text
20 videos
20 tracks
```

System melakukan:

```text
Shuffle
↓
Track random
↓
No repeat
```

Selama track masih tersedia, track tidak boleh digunakan dua kali dalam batch.

Jika jumlah track lebih sedikit daripada video:

```text
5 tracks
20 videos
```

setelah semua track digunakan, system melakukan shuffle ulang.

User bertanggung jawab atas hak penggunaan music yang diupload.

---

# 16. Batch Rendering

Rendering dilakukan server-side.

Workflow:

```text
Generate
   ↓
Create render jobs
   ↓
Queue
   ↓
Worker
   ↓
FFmpeg
   ↓
Store MP4
   ↓
Update status
```

Browser tidak menjadi tempat rendering utama.

User dapat meninggalkan halaman ketika rendering berlangsung.

---

# 17. Result Experience

Setelah batch selesai:

```text
20 Videos Ready

[ Download All as ZIP ]
```

Setiap video memiliki:

- preview,
- download,
- regenerate.

---

# 18. History

History berbasis batch.

Contoh:

```text
Oct 8, 2026
20 Videos
80 Images
Completed

Oct 7, 2026
15 Videos
60 Images
Completed
```

History digunakan untuk menemukan kembali hasil batch sebelumnya.

---

# 19. Navigation

Navigation minimum:

```text
Create
History
Music Library
Settings
```

Create menjadi halaman utama.

---

# 20. Settings

Settings menyimpan:

- default preset,
- advanced video configuration,
- output configuration.

Normal workflow tidak memerlukan user membuka Settings.

---

# 21. Functional Requirements

## FR-01 Upload

User dapat mengupload banyak image sekaligus.

## FR-02 Ordering

System mempertahankan urutan image.

## FR-03 Grouping

Setiap 4 image menjadi satu video.

## FR-04 Group Preview

System menampilkan grouping sebelum rendering.

## FR-05 Product Processing

Image pertama diproses sebagai product screenshot.

## FR-06 Review Processing

Image 2–4 diproses sebagai review.

## FR-07 Video Generation

System membuat MP4 9:16.

## FR-08 Music Assignment

System memilih music secara otomatis.

## FR-09 Batch Rendering

System dapat merender banyak video.

## FR-10 Progress

User dapat melihat progress batch.

## FR-11 Retry

Video gagal dapat dirender ulang.

## FR-12 Download

User dapat mengunduh individual video.

## FR-13 ZIP

User dapat mengunduh seluruh batch sebagai ZIP.

## FR-14 History

Batch sebelumnya dapat dilihat kembali.

## FR-15 Music Library

User dapat mengelola music.

---

# 22. Non-Functional Requirements

## Performance

- Upload tidak boleh membuat browser freeze.
- Rendering asynchronous.
- Satu video gagal tidak membatalkan video lain.
- Progress batch harus dapat diperbarui.

## Reliability

- Render job memiliki status.
- Job gagal dapat retry.
- Output disimpan setelah berhasil.

## Security

- Authentication.
- Authorization berdasarkan ownership.
- HTTPS.
- File validation.
- File size limit.
- Signed download URLs.
- Secure password hashing.
- Upload isolation.

## Scalability

Architecture harus memungkinkan penambahan worker:

```text
Worker 1
Worker 2
Worker 3
Worker 4
```

tanpa mengubah workflow user.

---

# 23. Technical Architecture

```text
                         ┌─────────────────────┐
                         │       User          │
                         └──────────┬──────────┘
                                    │ HTTPS
                                    ▼
                         ┌─────────────────────┐
                         │      Next.js        │
                         │      Frontend       │
                         └──────────┬──────────┘
                                    │ REST API
                                    ▼
                         ┌─────────────────────┐
                         │      FastAPI        │
                         │       Backend       │
                         └──────┬──────┬───────┘
                                │      │
                 ┌──────────────┘      └───────────────┐
                 ▼                                     ▼
        ┌─────────────────┐                    ┌─────────────────┐
        │   PostgreSQL    │                    │ Object Storage  │
        │    Metadata     │                    │   R2 / S3       │
        └─────────────────┘                    └─────────────────┘
                                │
                                ▼
                         ┌─────────────────┐
                         │      Redis      │
                         │    Job Queue    │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Render Worker   │
                         │    Celery       │
                         └───────┬─────────┘
                                 │
                 ┌───────────────┼────────────────┐
                 ▼               ▼                ▼
              OpenCV           Pillow           FFmpeg
                 │               │                │
                 └───────────────┴────────────────┘
                                 │
                                 ▼
                         ┌─────────────────┐
                         │ Generated MP4   │
                         │ + ZIP           │
                         └─────────────────┘
```

---

# 24. Recommended Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| UI | Tailwind CSS + shadcn/ui |
| Language | TypeScript |
| Backend | FastAPI |
| Database | PostgreSQL |
| Queue | Redis |
| Worker | Celery |
| Image Processing | OpenCV + Pillow |
| Video Rendering | FFmpeg |
| Object Storage | Cloudflare R2 / AWS S3 |
| Containerization | Docker |
| API | REST |
| Authentication | JWT or secure session |
| Deployment | Linux cloud server |

---

# 25. Architecture Responsibilities

### Frontend

- Upload UI
- Grouping preview
- Video preview
- Generate action
- Progress
- Results
- History
- Music Library
- Settings

### Backend

- Authentication
- Authorization
- Batch management
- Image metadata
- Grouping
- Render job creation
- Music assignment
- History
- Download authorization

### Worker

- Image processing
- Product detection
- Review fitting
- Video composition
- Audio processing
- FFmpeg rendering
- ZIP generation

---

# 26. Rendering Pipeline

```text
Batch
 ↓
Select 4 images
 ↓
Image #1 → Product Processor
Image #2 → Review Processor
Image #3 → Review Processor
Image #4 → Review Processor
 ↓
Create 1080×1920 canvas
 ↓
Apply slide-left transitions
 ↓
Select music
 ↓
Trim audio
 ↓
Mix audio
 ↓
Encode H.264/AAC
 ↓
Upload MP4
 ↓
Update video status
```

---

# 27. Data Model Overview

```text
User
 │
 ├───────────────┐
 │               │
 ▼               ▼
Batch          Music
 │
 ├── BatchImage
 │
 └── Video
       │
       ├── VideoImage
       │
       └── RenderJob
```

Core entities:

- User
- Batch
- BatchImage
- Video
- VideoImage
- Music
- RenderJob
- Preset

---

# 28. Database Schema

## users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## batches

```sql
CREATE TABLE batches (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255),
    total_images INT NOT NULL DEFAULT 0,
    total_videos INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP NULL
);
```

## batch_images

```sql
CREATE TABLE batch_images (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    image_type VARCHAR(20) NOT NULL,
    width INT,
    height INT,
    processed_path TEXT,
    detection_confidence DECIMAL(5,4),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(batch_id, sequence)
);
```

`image_type`:

```text
product
review
```

## music

```sql
CREATE TABLE music (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    original_filename VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    duration_seconds DECIMAL(10,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## videos

```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    music_id UUID REFERENCES music(id),
    output_path TEXT,
    duration_seconds DECIMAL(10,2),
    width INT,
    height INT,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP NULL,
    UNIQUE(batch_id, sequence)
);
```

## video_images

```sql
CREATE TABLE video_images (
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES batch_images(id),
    position INT NOT NULL,
    PRIMARY KEY(video_id, position),
    UNIQUE(video_id, image_id)
);
```

## render_jobs

```sql
CREATE TABLE render_jobs (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'queued',
    progress INT NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## presets

```sql
CREATE TABLE presets (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    images_per_video INT NOT NULL DEFAULT 4,
    duration_seconds DECIMAL(6,2) NOT NULL DEFAULT 10,
    width INT NOT NULL DEFAULT 1080,
    height INT NOT NULL DEFAULT 1920,
    transition VARCHAR(50) NOT NULL DEFAULT 'slide_left',
    music_mode VARCHAR(50) NOT NULL DEFAULT 'shuffle_no_repeat',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 29. API Specification Overview

Base URL:

```text
/api/v1
```

API menggunakan JSON untuk metadata dan multipart/form-data untuk file upload.

---

# 30. Authentication API

## POST /auth/register

```json
{
  "email": "user@example.com",
  "password": "********"
}
```

## POST /auth/login

```json
{
  "email": "user@example.com",
  "password": "********"
}
```

Response:

```json
{
  "access_token": "token",
  "token_type": "bearer"
}
```

---

# 31. Batch API

## POST /batches

```json
{
  "name": "Shopee Batch 001",
  "preset_id": "uuid"
}
```

## POST /batches/{batch_id}/images

Multipart:

```text
files[]
```

Response:

```json
{
  "batch_id": "uuid",
  "uploaded": 80
}
```

---

# 32. Grouping API

## POST /batches/{batch_id}/group

Response:

```json
{
  "batch_id": "uuid",
  "total_images": 80,
  "complete_videos": 20,
  "leftover_images": 0,
  "groups": [
    {
      "video_sequence": 1,
      "images": [1, 2, 3, 4]
    }
  ]
}
```

## GET /batches/{batch_id}/groups

Mengambil grouping untuk preview.

## PATCH /batches/{batch_id}/groups

Request:

```json
{
  "groups": [
    {
      "video_sequence": 1,
      "image_ids": [
        "uuid1",
        "uuid2",
        "uuid3",
        "uuid4"
      ]
    }
  ]
}
```

---

# 33. Generate API

## POST /batches/{batch_id}/generate

```json
{
  "preset_id": "uuid"
}
```

Response:

```json
{
  "batch_id": "uuid",
  "status": "queued",
  "total_videos": 20
}
```

Endpoint tidak menunggu semua rendering selesai.

---

# 34. Progress API

## GET /batches/{batch_id}/status

Response:

```json
{
  "batch_id": "uuid",
  "status": "processing",
  "total_videos": 20,
  "completed": 14,
  "failed": 0,
  "progress": 70
}
```

MVP dapat menggunakan polling. SSE/WebSocket dapat ditambahkan kemudian.

---

# 35. Video API

## GET /batches/{batch_id}/videos

Mengambil video dalam batch.

## GET /videos/{video_id}

Mengambil detail video.

## POST /videos/{video_id}/regenerate

Render ulang satu video.

---

# 36. Download API

## GET /videos/{video_id}/download

Menghasilkan signed download URL.

## GET /batches/{batch_id}/download

Menghasilkan atau mengembalikan ZIP batch.

---

# 37. Music API

## POST /music

Upload music.

## GET /music

List Music Library.

## GET /music/{music_id}/preview

Preview music.

## DELETE /music/{music_id}

Delete music.

---

# 38. Preset API

## GET /presets

Mengambil preset.

## POST /presets

Membuat custom preset pada versi yang mendukungnya.

## PATCH /presets/{preset_id}

Mengubah preset.

## DELETE /presets/{preset_id}

Menghapus custom preset.

---

# 39. Error Format

Semua API error menggunakan:

```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "The uploaded file type is not supported.",
    "details": {}
  }
}
```

Contoh error code:

```text
INVALID_FILE_TYPE
FILE_TOO_LARGE
INVALID_BATCH
INCOMPLETE_GROUP
PRODUCT_DETECTION_FAILED
RENDER_FAILED
MUSIC_NOT_FOUND
UNAUTHORIZED
FORBIDDEN
```

---

# 40. Storage Architecture

```text
bucket/
│
├── users/
│   └── {user_id}/
│       ├── uploads/
│       │   └── {batch_id}/
│       ├── processed/
│       │   └── {batch_id}/
│       ├── videos/
│       │   └── {batch_id}/
│       └── music/
│
└── archives/
    └── {batch_id}.zip
```

Database menyimpan metadata dan storage key, bukan file binary besar.

---

# 41. File Lifecycle

```text
Upload
 ↓
Original
 ↓
Processing
 ↓
Generated Video
 ↓
Download
 ↓
Retention Period
 ↓
Cleanup
```

Contoh awal:

- Original uploads: 30 hari
- Generated videos: 30 hari
- ZIP: 7–30 hari

Nilai final dapat disesuaikan dengan biaya storage.

---

# 42. Development Architecture

```text
affiliate-video-generator/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── types/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── core/
│   └── tests/
│
├── worker/
│   ├── tasks/
│   ├── image_processing/
│   ├── video_rendering/
│   └── music_processing/
│
├── infra/
│   ├── docker/
│   └── nginx/
│
├── docker-compose.yml
└── README.md
```

---

# 43. Product Success Metrics

Metric utama:

### Time Saved

Bandingkan workflow manual dengan workflow platform.

Metric tambahan:

- total time per batch,
- number of manual interactions,
- render success rate,
- product detection success rate,
- percentage of batches completed without manual correction,
- failed render rate.

---

# 44. Future Product Direction

Setelah core product stabil, produk dapat berkembang menjadi:

- multiple templates,
- custom presets,
- custom duration,
- custom image count,
- better product detection,
- blurred adaptive background,
- batch regenerate,
- additional output formats.

Fitur seperti AI caption, AI voice, product discovery, review discovery, dan auto-upload Shopee tetap di luar core MVP dan hanya dipertimbangkan jika kebutuhan produk berubah.

---

# 45. Product Definition

Produk ini adalah:

> **A batch automation tool for turning ordered affiliate screenshots into ready-to-upload short videos.**

Core value:

```text
USER
│
│ prepares screenshots
▼
┌─────────────────────────────┐
│ Affiliate Video Generator   │
│                             │
│ Group                       │
│ Process                     │
│ Compose                     │
│ Add Music                   │
│ Render                      │
│ Package                     │
└──────────────┬──────────────┘
               │
               ▼
        READY-TO-UPLOAD MP4
```
