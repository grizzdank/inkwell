# AGENTS.md - AI Developer Guide for Inkwell

> This document provides context and conventions for AI coding assistants (Claude, Codex, etc.) working on the Inkwell project.

## Project Overview

**Inkwell** is a journal digitization platform that transforms handwritten journal pages into searchable, analyzable digital content.

**Core Pipeline:**
```
Photo of journal page → Gemini OCR → Claude Analysis → Structured Markdown
```

**Value proposition:** "Analog journal → digital brain"

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js + TypeScript |
| Framework | Hono (lightweight HTTP server) |
| OCR | Gemini 1.5 Flash (Google AI) |
| Analysis | Claude (via OpenRouter or Anthropic API) |
| Package Manager | pnpm |

## Architecture

```
src/
└── index.ts          # Single-file application (all logic here)
```

**Design Philosophy:** This is intentionally a single-file application. Keep it that way unless there's a compelling reason to split. The simplicity is a feature.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check / service info |
| `/transcribe` | POST | OCR only (image → text) |
| `/analyze` | POST | Analysis only (text → insights) |
| `/process` | POST | Full pipeline (image → text → insights) |
| `/test` | GET | Interactive browser UI |

## Coding Conventions

### TypeScript
- Use strict mode (already configured in tsconfig.json)
- Prefer `const` over `let`
- Use explicit return types for exported functions
- Keep type definitions inline unless reused 3+ times

### Error Handling
- Return structured JSON errors with appropriate HTTP status codes
- Include descriptive error messages for debugging
- Gracefully degrade (e.g., analysis failure shouldn't break transcription)

### API Design
- All POST endpoints accept JSON with `Content-Type: application/json`
- Image data is base64 encoded with explicit `mediaType`
- Responses include `success` boolean and relevant data or `error` message

### Prompting Strategy
- **Transcription:** Low temperature (0.1), accuracy-focused, preserve formatting
- **Analysis:** Structured output with specific sections (mood, themes, people, patterns, prompts)
- Use YAML frontmatter for metadata extraction

## Environment Variables

```bash
# Required for OCR
GEMINI_API_KEY=          # Google AI Studio key

# Required for analysis (choose one)
OPENROUTER_API_KEY=      # Preferred - supports Claude subscription
ANTHROPIC_API_KEY=       # Direct Anthropic access

# Optional
GEMINI_MODEL=gemini-1.5-flash
CLAUDE_MODEL=claude-sonnet-4-20250514
PORT=3847
```

## Development Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Development mode with watch
pnpm start      # Production run
```

Test locally at: `http://localhost:3847/test`

## When Making Changes

### Do
- Keep the single-file architecture unless absolutely necessary
- Maintain backward compatibility for API endpoints
- Test with the `/test` UI before committing
- Update README.md if adding new endpoints or config options
- Handle both OpenRouter and direct Anthropic API paths

### Don't
- Add unnecessary dependencies (this is a lean project)
- Change the response schema without updating documentation
- Hard-code API keys or sensitive values
- Break the iOS Shortcut integration (expects specific response format)

## Future Considerations

The roadmap includes:
- Local markdown file storage
- Semantic search across entries
- Pattern analysis over time
- Mobile app integration

When implementing these, consider:
- File storage should be configurable (local vs cloud)
- Search should work offline
- Pattern analysis needs date normalization from transcriptions

## Testing Checklist

Before committing changes:
1. [ ] `pnpm dev` starts without errors
2. [ ] `/test` UI loads in browser
3. [ ] Transcription works with sample image
4. [ ] Analysis works with sample text
5. [ ] Full pipeline (`/process`) works end-to-end
6. [ ] Error cases return proper JSON (not stack traces)

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/index.ts` | All application logic |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `.env.example` | Environment variable template |
| `README.md` | User-facing documentation |

## Debugging Tips

- Check `GEMINI_API_KEY` is set for OCR failures
- Check `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY` for analysis failures
- Use `/transcribe` and `/analyze` separately to isolate issues
- Browser console in `/test` UI shows detailed errors

---

*Last updated: 2025-01-16*
