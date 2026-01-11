# 🐙 Inkwell

**Analog journal → digital brain.**

Photo your handwritten journal pages, get transcribed markdown with metadata and insights.

## Quick Start

```bash
# Install deps
pnpm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run the server
pnpm dev
```

Server runs on `http://localhost:3847`. Test UI at `/test`.

## API

### `POST /transcribe`

Request:
```json
{
  "image": "<base64-encoded-image>",
  "mediaType": "image/jpeg"  // optional, defaults to image/jpeg
}
```

Response:
```json
{
  "success": true,
  "markdown": "---\ndate: 2026-01-10\nmood: reflective\n...",
  "metadata": {
    "date": "2026-01-10",
    "mood": "reflective",
    "themes": "work, planning, goals",
    "confidence": "high"
  },
  "usage": {
    "input_tokens": 1523,
    "output_tokens": 456
  }
}
```

## iOS Shortcut Setup

Create a shortcut that:

1. **Take Photo** or **Select Photos** (camera/library)
2. **Base64 Encode** the image
3. **Get Contents of URL**:
   - URL: `http://your-server:3847/transcribe`
   - Method: POST
   - Headers: `Content-Type: application/json`
   - Request Body (JSON):
     ```json
     {
       "image": [Base64 Encoded Image],
       "mediaType": "image/jpeg"
     }
     ```
4. **Get Dictionary Value** for key `markdown`
5. **Save File** to iCloud/Files (name: `Journal-[Current Date].md`)
6. **Show Result** or **Quick Look**

### Shortcut Download

[TODO: Add iCloud shortcut link once tested]

### Alternative: Shortcuts + SSH

If server isn't exposed publicly, run via SSH from the shortcut:
1. Save photo to Files
2. Run SSH command to process
3. Retrieve result

## Tunnel for Testing

Expose local server for iOS testing:

```bash
# Using cloudflared
cloudflared tunnel --url http://localhost:3847

# Or ngrok
ngrok http 3847
```

## Roadmap

- [x] Basic transcription API
- [x] Test UI
- [ ] iOS Shortcut template
- [ ] Save to local markdown files
- [ ] Append to daily note
- [ ] Batch processing
- [ ] Semantic search across entries
- [ ] Pattern analysis ("mood trends")
- [ ] Mobile app

## Stack

- **Runtime:** Node.js + tsx
- **Framework:** Hono
- **AI:** Claude (Anthropic) - vision model for transcription
- **Future:** Embeddings for search, SQLite/Postgres for storage

---

*"Your journal. Your handwriting. Our brain."*
