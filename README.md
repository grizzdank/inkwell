# ✒️ Inkwell

**Analog journal → digital brain.**

Photo your handwritten journal pages, get transcribed markdown with deep insights.

## Architecture

```
📸 Journal Photo
       ↓
┌─────────────────┐
│  Gemini 1.5     │  ← Fast, cheap, great at handwriting OCR
│  (Transcribe)   │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Claude         │  ← Deep analysis, patterns, insights
│  (Analyze)      │
└────────┬────────┘
         ↓
📝 Structured Markdown + Insights
```

## Quick Start

```bash
# Install deps
pnpm install

# Set API keys
export GEMINI_API_KEY=your-key          # Required for OCR
export OPENROUTER_API_KEY=your-key      # For analysis (or ANTHROPIC_API_KEY)

# Run
pnpm dev
```

Open http://localhost:3847/test to try it.

## API Keys

### OCR (Required): Gemini
Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey)

### Analysis: Claude (pick one)

**Option A: OpenRouter (recommended)**
- Get key at [openrouter.ai/keys](https://openrouter.ai/keys)
- Can connect your Claude subscription via OAuth for free/cheaper usage
- Set `OPENROUTER_API_KEY`

**Option B: Anthropic API**
- Get key at [console.anthropic.com](https://console.anthropic.com/)
- Set `ANTHROPIC_API_KEY`

## API Endpoints

### `POST /transcribe`
OCR only (Gemini). Fast, returns transcription.

```bash
curl -X POST http://localhost:3847/transcribe \
  -H "Content-Type: application/json" \
  -d '{"image": "<base64>", "mediaType": "image/jpeg"}'
```

Response:
```json
{
  "success": true,
  "transcription": "Today I woke up feeling...",
  "metadata": { "date": "2026-01-10", "confidence": "high" },
  "markdown": "---\ndate: 2026-01-10\n...",
  "provider": "gemini"
}
```

### `POST /analyze`
Analysis only (Claude). Pass existing transcription.

```bash
curl -X POST http://localhost:3847/analyze \
  -H "Content-Type: application/json" \
  -d '{"transcription": "Today I woke up feeling..."}'
```

### `POST /process`
Full pipeline: transcribe + analyze.

```bash
curl -X POST http://localhost:3847/process \
  -H "Content-Type: application/json" \
  -d '{"image": "<base64>", "analyze": true}'
```

Response includes both `transcription` and `analysis` objects.

## iOS Shortcut

Create a shortcut that:

1. **Take Photo** or **Select Photos**
2. **Base64 Encode** the image
3. **Get Contents of URL**:
   - URL: `http://your-server:3847/process`
   - Method: POST
   - Headers: `Content-Type: application/json`
   - Body: `{"image": [Base64], "mediaType": "image/jpeg", "analyze": true}`
4. **Get Dictionary Value** → `transcription.markdown`
5. **Save File** to iCloud (name: `Journal-[Date].md`)

### Expose for iOS

```bash
# Cloudflare tunnel (recommended)
cloudflared tunnel --url http://localhost:3847

# Or ngrok
ngrok http 3847
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google AI API key for OCR |
| `OPENROUTER_API_KEY` | One of these | OpenRouter key (can use Claude subscription) |
| `ANTHROPIC_API_KEY` | One of these | Direct Anthropic API key |
| `GEMINI_MODEL` | No | Default: `gemini-1.5-flash` |
| `CLAUDE_MODEL` | No | Default: `claude-sonnet-4-20250514` |
| `PORT` | No | Default: `3847` |
| `INKWELL_MAX_IMAGE_BYTES` | No | Max base64 image size (bytes), default: `15728640` |
| `INKWELL_PROVIDER_TIMEOUT_MS` | No | Provider request timeout (ms), default: `45000` |

## Roadmap

- [x] Gemini OCR transcription
- [x] Claude analysis layer
- [x] OpenRouter support (use Claude subscription)
- [x] Test UI
- [ ] iOS Shortcut template file
- [ ] Local markdown file storage
- [ ] Semantic search across entries
- [ ] Pattern analysis over time
- [ ] Mobile app

## Stack

- **Runtime:** Node.js + tsx
- **Framework:** Hono
- **OCR:** Gemini 1.5 (Google AI)
- **Analysis:** Claude (via OpenRouter or Anthropic)

---

*"Your journal. Your handwriting. Our brain."*
