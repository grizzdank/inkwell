# Inkwell App — Technical Plan (Draft)

> Note: In the current workspace (`/home/daveg/pulpito`) there is **no `README.md`** and no Inkwell source tree (only personal docs/notes). This plan is therefore **structure-first** and includes **explicit placeholders** for the processing details “as described in README.md”. Once the actual Inkwell repo is available, the integration + pipeline steps can be made concrete.

## 1) Product Summary (What we’re building)
- iPhone-first app that captures a **photo of a journal page**.
- Runs an on-device / server-assisted **processing pipeline** (per Inkwell README) to produce a clean digital record.
- Presents results in a friendly UI, supports review/corrections, and stores originals + outputs.

## 2) Architecture Choice: iOS Native vs PWA (iPhone)

### Option A — iOS Native (Recommended if quality + capture UX matter)
**Pros**
- Best camera control: focus/exposure, lens selection, stabilization, Live Text integration.
- Best image pre-processing: fast on-device CV, Metal/Accelerate, better memory control.
- Background work: `BGTaskScheduler`, reliable uploads, offline-first sync.
- Local privacy: can keep more steps on-device; strong sandboxing.

**Cons**
- Higher dev cost (Swift/SwiftUI, iOS build + distribution).
- App Store review + release overhead.
- Less portable (iOS-only unless also building Android).

### Option B — PWA (Recommended if speed-to-market matters)
**Pros**
- Single codebase: web stack, easier iteration, easier sharing.
- No App Store gate; instant deploy.
- Good enough for “upload photo → process → show result”.

**Cons**
- iOS Safari limitations: camera APIs + file handling are weaker; inconsistent capture UX.
- Offline/background sync less reliable.
- On-device ML/CV is possible (WASM/WebGPU) but more complex and less predictable.

### Recommendation
- **Start with iOS Native** if the differentiator is capture quality, page detection, offline, and a “scanner-like” flow.
- **Start with PWA** if the pipeline is mostly server-side and capture quality can be “good enough” using file upload + light client guidance.

## 3) Tech Stack Recommendations

### iOS Native stack (primary recommendation)
- UI: **SwiftUI** (+ `PhotosUI`, `AVFoundation` for camera)
- Camera/scanning: `AVCaptureSession` + rectangle/page detection (Vision)
- Image pre-processing: **Vision**, **Core Image**, **Accelerate**
- On-device OCR (optional): **Vision OCR**; server OCR fallback
- Networking: `URLSession` + async/await
- Storage:
  - Local: **Core Data** or **SQLite** (via GRDB) for metadata
  - Files: app sandbox for images/PDF outputs
- Sync (optional): CloudKit or custom API
- Analytics/Crash: optional (Sentry/Firebase)

### PWA stack (secondary)
- UI: **React** or **SvelteKit**
- Camera/file input: `<input capture>` + optional getUserMedia where supported
- Processing: server-first; client does light transforms (crop/rotate/compress)
- Storage: IndexedDB + Service Worker caching

### Backend (if processing isn’t fully on-device)
- API: Node/Express or FastAPI
- Processing workers: queue-based (BullMQ / Celery)
- Storage: S3-compatible for originals/derivatives
- DB: Postgres for jobs + documents + user data

## 4) Key Components

### 4.1 Photo Capture
**Goals**
- Fast “scan page” flow with real-time guidance.

**iOS Native approach**
- `AVFoundation` camera view.
- Vision rectangle detection to auto-detect page bounds.
- Capture high-res still; optionally burst for best focus.
- UX: “Hold steady” + auto-capture when stable.

**PWA approach**
- Capture via file input; optionally request camera.
- Provide overlay grid and “keep page within frame” guidance.

### 4.2 Processing Pipeline (per Inkwell README)
> Replace the below with the actual steps once the README is available.

Proposed pipeline stages (common for journal-page digitization):
1. **Ingest**: receive image, store original.
2. **Detect page**: find corners, perspective transform, deskew.
3. **Normalize**: contrast/levels, remove shadows, denoise.
4. **Segment** (optional): isolate writing regions vs margins.
5. **OCR / transcription**: extract text (handwriting vs printed changes approach).
6. **Post-process**: correct common OCR issues; structure into paragraphs/lines.
7. **Export**: searchable PDF, Markdown, plain text, and/or image.
8. **Human review**: user edits text / confirms outputs.

**Where each step runs**
- On-device for steps 1–3 (best UX + privacy), server for OCR/LLM-heavy steps.
- If privacy-critical, keep OCR local where possible.

### 4.3 UI/UX
- Primary screens:
  - Capture (scanner-like)
  - Review crop/rotate (before processing)
  - Processing progress (job state)
  - Result view: image + extracted text
  - Edit/correct text
  - History library (pages, sessions, tags)
- Accessibility: large text, voiceover labels.

### 4.4 Storage Model
- Entities:
  - `Document` (journal entry/page), `Scan` (original image), `Derivative` (cropped/cleaned image), `Transcript` (text + metadata), `ProcessingJob` (status)
- Offline-first:
  - Store local originals + metadata; sync later.
  - Retry uploads and processing.

### 4.5 Security/Privacy
- At rest: iOS data protection; optional encrypted DB.
- In transit: TLS, signed URLs for uploads.
- Data retention: user-controlled delete; minimize server copies.

## 5) Integration Points with Existing Inkwell Repo Code
- **Blocked**: In this workspace there is no Inkwell codebase to reference.

Once the Inkwell repo is available, identify:
- Existing processing scripts/services (OCR, cleanup, LLM prompt templates, etc.).
- Expected input/output formats (image resolution, JSON schema, PDF generation).
- Where to host processing (local library vs HTTP service).
- Reusable UI assets or any existing web frontend.

## 6) Estimated Timeline / Scope

### Phase 0 — Repo alignment (0.5–1 day)
- Confirm the pipeline steps from `README.md`.
- Decide iOS vs PWA based on pipeline location (device/server).

### Phase 1 — MVP capture + upload + results (1–2 weeks)
- Capture page photo (or upload) + manual crop.
- Send to processing endpoint (or local pipeline stub).
- Display extracted text + cleaned image.
- Store scan history locally.

### Phase 2 — Quality & usability (1–2 weeks)
- Auto page detection + deskew.
- Better processing progress + retry.
- Basic text editing + export.

### Phase 3 — “Delight” + robustness (2–4 weeks)
- Offline-first + background sync.
- Tags/search, multi-page entries, PDF bundle export.
- Privacy controls, iCloud/backup.

## 7) Concrete Next Steps
1. Add/point me to the actual **Inkwell repo** (or paste `README.md`).
2. Decide architecture (iOS native vs PWA) with two questions:
   - Is processing mostly server-side?
   - Is scanning UX a core differentiator?
3. Define pipeline I/O contract:
   - Input image constraints (min DPI, max size)
   - Output schemas (text, bounding boxes, PDF)
4. Choose MVP “happy path” and define success metrics.

---

## Appendix: Open Questions (to finalize plan)
- What exactly are the README’s processing steps and outputs?
- Handwriting recognition required, or typed text only?
- Single-page only, or multi-page sessions?
- Local-only storage acceptable, or must sync?
- Export formats: PDF, Markdown, Obsidian, Notion, etc.?
