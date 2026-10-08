# MVP — Shopee Affiliate Batch Video Generator

**Version:** 1.0  
**Status:** MVP Scope & Execution Plan  
**Relationship:** Derived from `PRD.md`

---

# 1. MVP Definition

MVP adalah versi terkecil dari produk yang sudah memberikan value utama:

> **User dapat memasukkan sekumpulan screenshot yang sudah disiapkan, membiarkan sistem mengelompokkannya, menghasilkan video affiliate secara otomatis, lalu mengunduh hasilnya sebagai MP4 atau ZIP.**

MVP tidak bertujuan menjadi full video editor.

---

# 2. MVP Goal

Mengubah:

```text
80 screenshots
```

menjadi:

```text
20 ready-to-upload videos
```

dengan interaksi minimal:

```text
Upload
 ↓
Check
 ↓
Generate
 ↓
Download
```

---

# 3. MVP User Flow

```text
Create
  ↓
Drag & Drop Screenshots
  ↓
Upload
  ↓
Auto Grouping
  ↓
Check Grouping
  ↓
Generate Videos
  ↓
Rendering Progress
  ↓
Videos Ready
  ↓
Download Individual / ZIP
```

Normal workflow tidak membutuhkan konfigurasi template.

---

# 4. MVP Feature Scope

## 4.1 Upload

### Required

- Bulk upload
- Drag & drop
- JPG
- JPEG
- PNG
- WEBP
- Multiple files
- Ordered processing

### User experience

User cukup memilih atau drag banyak screenshot.

Tidak perlu:

- membuat folder,
- membuat project satu per satu,
- memilih product/review secara manual.

---

# 5. MVP Grouping

## Rule

```text
4 images = 1 video
```

Role:

```text
Image 1 = Product
Image 2 = Review
Image 3 = Review
Image 4 = Review
```

Contoh:

```text
80 images
↓
20 videos
```

---

# 6. MVP Leftover Handling

Jika:

```text
14 images
```

maka:

```text
Video 1 → 4
Video 2 → 4
Video 3 → 4
Leftover → 2
```

System:

- membuat 3 complete videos,
- tidak membuat video ke-4,
- menampilkan warning.

UI:

> ⚠️ 2 images are left over and won't be included.

---

# 7. MVP Grouping Preview

User melihat:

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

- preview,
- reorder,
- replace,
- remove.

Tujuan utama preview adalah memastikan automation tidak salah sebelum rendering.

---

# 8. MVP Product Processing

Image pertama setiap group diproses sebagai product screenshot.

Pipeline:

```text
Screenshot
 ↓
Detect Product Area
 ↓
Remove Unwanted UI
 ↓
Crop
 ↓
Detect Background
 ↓
Adaptive Background
 ↓
Auto Position
```

### Technology

- OpenCV
- Pillow
- image analysis / heuristics

Tidak menggunakan generative AI sebagai dependency MVP.

---

# 9. MVP Product Detection Fallback

Jika detection confidence tinggi:

```text
Confidence: 96%
✓ Auto processed
```

Jika rendah:

```text
⚠️ We couldn't confidently detect the product image.

[Adjust Crop]
```

MVP tidak boleh gagal total hanya karena satu screenshot sulit dideteksi.

---

# 10. MVP Review Processing

Review image:

```text
Resize
 ↓
Fit
 ↓
9:16 canvas
```

Tidak melakukan aggressive crop.

Prioritas:

1. Review text tetap terbaca.
2. Rating tetap terlihat.
3. Foto review tetap terlihat.
4. Username tetap terlihat jika berada dalam screenshot.

---

# 11. MVP Video Template

Default:

## Shopee Affiliate — Basic Slide 10s

```text
Images        4
Duration      ±10 seconds
Resolution    1080×1920
Aspect ratio  9:16
Transition    Slide Left
Output        MP4
Codec         H.264
Audio         AAC
```

User tidak mengatur parameter tersebut pada workflow utama.

---

# 12. MVP Transition

Hanya:

> **Horizontal Slide Left**

Tidak ada:

- zoom,
- fade,
- shake,
- Ken Burns,
- sticker,
- text animation.

MVP sengaja membatasi visual effect agar rendering sederhana dan konsisten.

---

# 13. MVP Music Library

User dapat:

- upload music,
- preview,
- delete.

Format:

```text
MP3
WAV
M4A
```

Tidak ada:

- genre tagging,
- mood tagging,
- automatic music discovery.

---

# 14. MVP Music Assignment

Mode default:

> **Shuffle without repeat**

Contoh:

```text
Video 01 → Track 07
Video 02 → Track 02
Video 03 → Track 11
Video 04 → Track 05
```

Track tidak boleh diulang sebelum semua track yang tersedia digunakan.

Jika:

```text
5 tracks
20 videos
```

system mengulang cycle setelah 5 track habis dengan shuffle baru.

Music otomatis:

- dipilih,
- dipotong agar sesuai durasi,
- dimasukkan ke video.

---

# 15. MVP Batch Rendering

Rendering menggunakan queue.

```text
Generate
 ↓
20 jobs
 ↓
Queue
 ↓
Worker
 ↓
FFmpeg
```

Status:

```text
Waiting
Rendering
Completed
Failed
```

---

# 16. MVP Progress

Contoh:

```text
Generating Videos

██████████████░░░░░░

14 / 20 completed
```

User dapat melihat status per video.

---

# 17. MVP Failure Isolation

Jika:

```text
Video 01 ✓
Video 02 ✓
Video 03 ✕
Video 04 ✓
```

maka Video 01, 02, dan 04 tetap tersedia.

Video 03 dapat:

```text
[Retry]
```

Batch tidak dianggap gagal total hanya karena satu video gagal.

---

# 18. MVP Regenerate

User dapat regenerate satu video.

Input tetap:

```text
Same images
Same preset
```

Music dapat dipilih ulang secara otomatis.

Tidak perlu upload ulang.

---

# 19. MVP Output

Setiap video:

```text
01.mp4
02.mp4
03.mp4
...
```

User dapat:

### Individual

```text
[Download]
```

### Batch

```text
[Download All as ZIP]
```

ZIP:

```text
Shopee_Affiliate_Batch_2026-10-08.zip
```

---

# 20. MVP History

Batch disimpan dengan informasi:

```text
Date
Name
Image count
Video count
Status
```

Contoh:

```text
Oct 8, 2026
20 Videos
80 Images
Completed
```

User dapat membuka batch untuk melihat video.

---

# 21. MVP Navigation

```text
Create
History
Music Library
Settings
```

Tidak ada dashboard analytics yang kompleks.

---

# 22. MVP Settings

Default preset:

```text
Shopee Affiliate — Basic Slide 10s
```

MVP tidak memprioritaskan custom preset.

Settings terutama untuk:

- melihat preset aktif,
- konfigurasi dasar yang memang diperlukan,
- account settings.

---

# 23. MVP Technical Stack

```text
Frontend
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui

Backend
FastAPI
Python

Database
PostgreSQL

Queue
Redis

Worker
Celery

Image
OpenCV
Pillow

Video
FFmpeg

Storage
Cloudflare R2 / S3

Infrastructure
Docker
Linux server
```

---

# 24. MVP Architecture

```text
Browser
   │
   ▼
Next.js
   │
   ▼
FastAPI
   │
   ├──────────────► PostgreSQL
   │
   ├──────────────► Object Storage
   │
   └──────────────► Redis
                         │
                         ▼
                      Celery
                         │
                         ▼
                  Render Worker
                   │    │    │
                   ▼    ▼    ▼
                 OpenCV Pillow FFmpeg
                         │
                         ▼
                   MP4 / ZIP
```

---

# 25. MVP Database

MVP minimum membutuhkan:

```text
users
batches
batch_images
videos
video_images
music
render_jobs
```

`presets` dapat tetap dibuat sejak awal agar architecture siap untuk custom preset, tetapi hanya satu default preset yang digunakan dalam MVP.

---

# 26. MVP API

Minimum API:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login

POST   /api/v1/batches
POST   /api/v1/batches/{id}/images

POST   /api/v1/batches/{id}/group
GET    /api/v1/batches/{id}/groups
PATCH  /api/v1/batches/{id}/groups

POST   /api/v1/batches/{id}/generate
GET    /api/v1/batches/{id}/status

GET    /api/v1/batches/{id}/videos
GET    /api/v1/videos/{id}
POST   /api/v1/videos/{id}/regenerate

GET    /api/v1/videos/{id}/download
GET    /api/v1/batches/{id}/download

POST   /api/v1/music
GET    /api/v1/music
GET    /api/v1/music/{id}/preview
DELETE /api/v1/music/{id}
```

---

# 27. MVP Storage

File storage:

```text
users/{user_id}/uploads/{batch_id}/
users/{user_id}/processed/{batch_id}/
users/{user_id}/videos/{batch_id}/
users/{user_id}/music/
archives/{batch_id}.zip
```

Database hanya menyimpan metadata/path.

---

# 28. MVP Security

Wajib:

- authentication,
- authorization,
- HTTPS,
- file type validation,
- file size limit,
- signed URLs,
- secure password hashing,
- user ownership checks,
- upload isolation,
- rate limiting.

---

# 29. MVP File Cleanup

Recommended initial retention:

```text
Original uploads → 30 days
Generated videos → 30 days
ZIP → 7–30 days
```

Cleanup dilakukan otomatis.

---

# 30. MVP Development Order

## Phase 1 — Rendering Proof of Concept

Prioritas pertama:

```text
4 images
+
music
↓
FFmpeg
↓
10-second MP4
```

Acceptance:

- 1080×1920,
- 9:16,
- ±10 sec,
- slide-left,
- music,
- playable MP4.

---

## Phase 2 — Product Image Processing

```text
Shopee screenshot
↓
Product detection
↓
UI removal
↓
Crop
↓
Background
↓
Product showcase
```

Test dengan banyak variasi screenshot.

---

## Phase 3 — Batch Engine

```text
80 images
↓
20 groups
↓
20 jobs
↓
20 videos
```

---

## Phase 4 — Backend

Implement:

- PostgreSQL,
- FastAPI,
- Redis,
- Celery,
- storage,
- authentication.

---

## Phase 5 — Frontend

Implement:

- Create,
- upload,
- grouping preview,
- generate,
- progress,
- result.

---

## Phase 6 — Music & History

Implement:

- Music Library,
- shuffle,
- no-repeat,
- History,
- regenerate,
- ZIP.

---

## Phase 7 — Testing & Deployment

Implement:

- unit tests,
- integration tests,
- rendering tests,
- file validation,
- security checks,
- Docker,
- deployment,
- monitoring.

---

# 31. MVP Acceptance Criteria

## AC-01 — Single Video

4 screenshots menghasilkan 1 video.

## AC-02 — Batch

80 screenshots menghasilkan 20 videos.

## AC-03 — Grouping

Urutan image menentukan grouping.

## AC-04 — Leftover

14 images menghasilkan:

```text
3 complete videos
2 leftover
```

## AC-05 — Product Processing

Image pertama diproses sebagai product showcase.

## AC-06 — Review Processing

Image 2–4 diproses sebagai review.

## AC-07 — Video Format

Output:

```text
1080×1920
9:16
MP4
```

## AC-08 — Duration

Output sekitar 10 detik.

## AC-09 — Transition

Horizontal slide-left.

## AC-10 — Music

Music otomatis diambil dari Music Library.

## AC-11 — Music No Repeat

Track tidak diulang sebelum seluruh track yang tersedia digunakan.

## AC-12 — Server Rendering

Rendering tidak bergantung pada browser tetap terbuka.

## AC-13 — Failure Isolation

Video yang gagal tidak membatalkan video lain.

## AC-14 — Retry

Video gagal dapat di-render ulang.

## AC-15 — ZIP

Semua video dapat diunduh sebagai ZIP.

## AC-16 — History

Batch yang selesai dapat ditemukan kembali.

---

# 32. MVP Definition of Done

MVP dinyatakan selesai apabila user dapat melakukan:

```text
Drop screenshots
      ↓
System groups images
      ↓
User checks grouping
      ↓
System processes images
      ↓
System renders videos
      ↓
Music added automatically
      ↓
Batch completed
      ↓
Download ZIP
```

Tanpa melakukan editing video manual untuk setiap video.

---

# 33. MVP Success Metrics

Primary metric:

> **Time saved per batch**

Secondary metrics:

- average batch completion time,
- number of manual interactions,
- render success rate,
- product detection success rate,
- manual correction rate,
- failed render rate,
- percentage of batches completed successfully.

---

# 34. Explicitly Out of MVP

Fitur berikut tidak boleh masuk MVP:

```text
❌ Auto product discovery
❌ Auto review discovery
❌ Auto Shopee upload
❌ Affiliate link generator
❌ AI caption
❌ AI voice
❌ Text-to-video
❌ Full timeline editor
❌ Sticker system
❌ Text animation
❌ Multiple complex transitions
❌ Social media scheduler
❌ Music tagging
❌ Advanced analytics
```

Tujuannya menjaga MVP tetap fokus.

---

# 35. Post-MVP Roadmap

## V1.1

- Multiple templates
- Custom presets
- Custom duration
- Custom image count
- Better crop correction
- Batch regenerate

## V1.2

- Better product detection
- Blurred adaptive background
- More transitions
- Preset duplication

## V2

Kemungkinan:

- AI caption
- AI voice
- Product metadata
- Additional platform formats
- Scheduling

Fitur tersebut hanya dipertimbangkan setelah core batch workflow stabil.

---

# 36. MVP Final Scope

```text
INPUT
✓ Bulk screenshots

GROUPING
✓ Ordered grouping
✓ 4 images / video
✓ Preview
✓ Leftover warning

IMAGE
✓ Product smart processing
✓ UI removal
✓ Adaptive background
✓ Review preservation

VIDEO
✓ 9:16
✓ 1080×1920
✓ ±10 seconds
✓ Slide-left
✓ MP4

MUSIC
✓ Upload
✓ Library
✓ Preview
✓ Delete
✓ Shuffle
✓ No-repeat

RENDER
✓ Server-side
✓ Queue
✓ Progress
✓ Retry
✓ Regenerate

OUTPUT
✓ Individual MP4
✓ ZIP

MANAGEMENT
✓ Authentication
✓ History
✓ User-owned files
```

---

# 37. Final MVP Statement

> **MVP adalah web application yang memungkinkan affiliate creator mengupload sekumpulan screenshot secara berurutan, otomatis mengelompokkannya menjadi 4 screenshot per video, memproses screenshot produk dan review, menambahkan music secara otomatis, merender video 9:16 berdurasi ±10 detik secara batch, dan mengunduh seluruh hasil sebagai ZIP.**

Jika workflow ini sudah stabil, MVP telah mencapai tujuan utamanya.
