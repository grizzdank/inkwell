# Phase B — iOS Native MVP (Actionable Todos)

## Scope
Build capture → review → upload flow, display transcription + analysis, and provide basic local history.

## Tasks
1. Create new Xcode SwiftUI app project and set minimum iOS target.
2. Add base URL configuration for backend (local + Tailscale) and environment switch.
3. Build camera capture screen using AVFoundation.
4. Add live page rectangle detection overlay (Vision) with guidance UI.
5. Implement capture flow: take photo, show preview, retake/confirm.
6. Add optional crop/rotate step (basic editing).
7. Convert image to JPEG, base64-encode, include `mediaType`.
8. Implement network client for `/process` with JSON request/response models.
9. Add “Analyze” toggle (default on) to control `analyze` flag.
10. Build results screen: transcription markdown display + analysis sections.
11. Render markdown (basic) or display raw text with preserved formatting.
12. Add loading and error states (network errors, API errors).
13. Implement local history list (in-app storage) with minimal metadata.
14. Save last N entries locally (transcription, analysis, date, thumbnail).
15. Wire navigation: Capture → Review → Results → History detail.
16. Add basic settings screen (backend URL, analyze toggle).
17. Add app icon and simple launch screen.

## Notes
- Keep Phase B focused on MVP flow and data handling; defer iCloud to Phase C.
- Ensure requests match backend JSON shape and include `mediaType`.
- Prefer a simple markdown renderer or monospaced text block for initial display.
