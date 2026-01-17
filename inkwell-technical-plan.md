# Inkwell — Technical Plan (Repo-Grounded, iPhone-Focused)

Plan only. This document reflects the current single-file Node/TypeScript Hono service in `src/index.ts` and the pipeline described in `README.md`.

## 1) Recommendation (chosen for V1)
**iOS Native (SwiftUI + AVFoundation).**  
Reason: capture quality and scanner-like UX are core to handwriting OCR accuracy; iOS gives more reliable camera control, page detection, and offline handling. The existing Node service remains the processing backend.

## 2) Current Backend Baseline (as implemented)
- Single-file server: `src/index.ts` with Hono + @hono/node-server.
- Endpoints:
  - `GET /` health + version + endpoint map.
  - `POST /transcribe` → Gemini OCR only.
  - `POST /analyze` → Claude analysis only.
  - `POST /process` → full pipeline (transcribe → analyze).
  - `GET /test` → built-in HTML test UI.
- Providers:
  - OCR: Gemini 1.5 Flash via Google AI Studio API.
  - Analysis: Claude via OpenRouter (preferred) or direct Anthropic API.
- Response shape:
  - `success` boolean where appropriate.
  - Transcription returns `transcription`, `metadata`, `markdown`, `provider`.
  - Analysis returns `analysis`/`insights`, `provider`.
  - `/process` returns `transcription` object + optional `analysis`.
- Error handling:
  - JSON error responses; analysis failure in `/process` is non-fatal.

## 3) Client Architecture (iOS Native, V1)
- **UI:** SwiftUI.
- **Camera:** AVFoundation with live page rectangle detection (Vision).
- **Flow:**
  1) Capture page photo with guidance overlay.
  2) Review crop/rotate (optional).
  3) Send to backend `/process` with base64 + mediaType.
  4) Render transcription markdown + analysis sections.
- **Offline handling:** Store originals and queued uploads in app sandbox; retry in background.

### PWA (React) — defer to later
- Keep as a V2 fallback if App Store distribution becomes a blocker.

## 4) Visual Direction (Japanese calligraphy, elegant, clean, interesting)
Design intent: calm, refined, tactile. Blend negative space with ink-like accents.

**Typography**
- Primary: a modern Mincho-inspired serif (e.g., "Noto Serif JP", "Yu Mincho" on iOS).
- Secondary: a neutral sans for UI chrome (e.g., "SF Pro" fallback for controls).
- Use generous line-height and tight typographic hierarchy.

**Color**
- Base: warm paper whites (#F7F3EE) and charcoal ink (#2A2724).
- Accents: sumi ink wash gray (#6B6762) and muted indigo (#2E3A4F).
- Use subtle gradients and paper texture motifs (no flat white).

**Layout**
- Large margins, asymmetric rhythm, vertical breathing room.
- Use brush-stroke divider motifs sparingly.
- Focus on a single task per screen.

**Motion**
- Soft fade-in for results, gentle parallax on paper texture.
- Staggered reveal for analysis sections to feel “ink spreading”.

**Iconography**
- Minimal line icons; avoid glossy or skeuomorphic UI.

## 5) iOS Development Workflow (optional, based on Dimillian/Skills)
Use these focused workflows to speed up iOS development and QA:
- **iOS Debugger Agent:** build/run on simulators, interact with UI, capture logs/screenshots.
- **SwiftUI UI Patterns:** guidance for NavigationStack, sheets, and state ownership.
- **SwiftUI View Refactor:** standardize view structure and Observation usage.
- **Swift Concurrency Expert:** resolve Sendable/actor-isolation issues early.
- **SwiftUI Performance Audit:** catch janky scrolling and excessive re-renders.

## 6) Data & Storage (V1 choice + future options)
**V1: iCloud Drive / iCloud Sync**
- Store markdown files in a user-visible folder with images alongside.
- Pros: native sync, user control, minimal server state.
- Cons: iOS-only, dependency on iCloud state.

**Future options**
- Local-only (no sync).
- Obsidian vault export (file-based).
- Supabase (auth + multi-device + search).

## 7) Work Plan (phased)

### Phase A — Backend reliability (no schema breaks)
1. Validate base64 length and mediaType format.
2. Add request timeouts for Gemini and Claude.
3. Ensure all POST responses include `success` (no key renames).

### Phase B — Client MVP (iOS Native)
1. Build capture → review → upload flow.
2. Display transcription markdown + analysis sections.
3. Local history list (basic).

### Phase C — iCloud storage
1. Implement iCloud container + file coordination.
2. Save markdown + images per entry.
3. Document folder structure and naming in README.

### Phase D — Quality and polish
1. Better OCR inputs: image resize/compress presets.
2. UI polish per design guidelines.
3. Add “analysis optional” toggle.

## 8) Testing Plan (repo-based)
- Start server: `pnpm dev`.
- Verify `/test` UI loads at `http://localhost:3847/test`.
- Use a sample image to confirm:
  - `/transcribe` returns markdown + metadata.
  - `/process` returns transcription + analysis.
- Negative tests:
  - Missing `image` returns JSON error with 400.
  - Missing API keys returns JSON error with 500.

## 9) iCloud Structure + Local Index (confirmed)
- **Folder convention:** `Inkwell/YYYY/MM-DD/` with files:
  - `entry.md` (transcription markdown + metadata frontmatter)
  - `analysis.md` (analysis output)
  - `original.jpg` (source image)
- **Local index:** lightweight `index.json` stored in app sandbox for fast browsing;
  rebuildable from iCloud if missing.

## 10) Local iOS Testing Notes (with Tailscale)
- Use your Mac’s Tailscale IP from the iPhone to reach the local backend:
  `http://<mac-tailscale-ip>:3847`
- Simulator can use `http://localhost:3847` directly.
