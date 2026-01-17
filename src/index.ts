import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

const app = new Hono();
app.use("/*", cors());

// ============================================================================
// Provider Configs
// ============================================================================

interface TranscriptionResult {
  text: string;
  metadata: Record<string, string>;
  raw: string;
}

interface AnalysisResult {
  insights: string;
  raw: string;
}

const DEFAULT_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const DEFAULT_PROVIDER_TIMEOUT_MS = 45_000;

function getMaxImageBytes(): number {
  const raw = process.env.INKWELL_MAX_IMAGE_BYTES;
  const parsed = raw ? Number(raw) : DEFAULT_MAX_IMAGE_BYTES;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_IMAGE_BYTES;
}

function getProviderTimeoutMs(): number {
  const raw = process.env.INKWELL_PROVIDER_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : DEFAULT_PROVIDER_TIMEOUT_MS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PROVIDER_TIMEOUT_MS;
}

function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// Gemini for OCR (fast, cheap, good at handwriting)
async function transcribeWithGemini(
  imageBase64: string,
  mediaType: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY required");

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mediaType,
                  data: imageBase64,
                },
              },
              {
                text: TRANSCRIBE_PROMPT,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    },
    getProviderTimeoutMs()
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return {
    text: extractTranscription(text),
    metadata: extractFrontmatter(text),
    raw: text,
  };
}

// Claude for analysis (via API key or OpenRouter)
async function analyzeWithClaude(
  transcription: string,
  imageBase64?: string,
  mediaType?: string
): Promise<AnalysisResult> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openrouterKey && !anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY or OPENROUTER_API_KEY required for analysis");
  }

  // Prefer OpenRouter if available (can use Claude subscription via OAuth)
  const useOpenRouter = !!openrouterKey;
  const apiUrl = useOpenRouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.anthropic.com/v1/messages";

  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let body: unknown;

  if (useOpenRouter) {
    headers["Authorization"] = `Bearer ${openrouterKey}`;
    headers["HTTP-Referer"] = "https://github.com/grizzdank/inkwell";
    headers["X-Title"] = "Inkwell";

    body = {
      model: `anthropic/${model}`,
      messages: [
        {
          role: "user",
          content: ANALYSIS_PROMPT.replace("{{TRANSCRIPTION}}", transcription),
        },
      ],
      max_tokens: 2048,
    };
  } else {
    headers["x-api-key"] = anthropicKey!;
    headers["anthropic-version"] = "2023-06-01";

    body = {
      model,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: ANALYSIS_PROMPT.replace("{{TRANSCRIPTION}}", transcription),
        },
      ],
    };
  }

  const response = await fetchWithTimeout(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }, getProviderTimeoutMs());

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error (${response.status}): ${err}`);
  }

  const data = await response.json();

  let text: string;
  if (useOpenRouter) {
    text = data.choices?.[0]?.message?.content || "";
  } else {
    text = data.content?.[0]?.text || "";
  }

  return {
    insights: text,
    raw: text,
  };
}

// ============================================================================
// Prompts
// ============================================================================

const TRANSCRIBE_PROMPT = `You are a handwriting transcription specialist. Analyze this handwritten journal page and transcribe it accurately.

Output format (markdown):

---
date: [YYYY-MM-DD if visible, otherwise "unknown"]
confidence: [high/medium/low - your confidence in transcription accuracy]
---

## Transcription

[The transcribed text, preserving paragraph breaks. Use [unclear] for illegible words. Do not interpret or summarize - transcribe exactly what is written.]
`;

const ANALYSIS_PROMPT = `You are a journal analysis assistant. Analyze this journal entry and provide insights.

Journal Entry:
{{TRANSCRIPTION}}

Provide analysis in this format:

## Mood & Emotional State
[Detected mood, emotional indicators - be specific about what text suggests this]

## Key Themes
[2-5 main themes or topics mentioned]

## People & Places
[Any people or places mentioned, with context]

## Notable Patterns
[Any patterns, recurring thoughts, or significant observations]

## Reflection Prompts
[2-3 thoughtful questions the writer might consider based on this entry]
`;

// ============================================================================
// Helpers
// ============================================================================

function extractFrontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const metadata: Record<string, string> = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      metadata[key] = value;
    }
  }
  return metadata;
}

function extractTranscription(text: string): string {
  // Remove frontmatter and get the transcription section
  const withoutFrontmatter = text.replace(/^---\n[\s\S]*?\n---\n*/, "");
  const transcriptionMatch = withoutFrontmatter.match(
    /## Transcription\n+([\s\S]*?)(?=\n## |$)/
  );
  return transcriptionMatch ? transcriptionMatch[1].trim() : withoutFrontmatter.trim();
}

// ============================================================================
// Routes
// ============================================================================

app.get("/", (c) =>
  c.json({
    status: "ok",
    service: "inkwell",
    version: "0.2.0",
    endpoints: {
      "/transcribe": "POST - OCR transcription (Gemini)",
      "/analyze": "POST - Deep analysis (Claude)",
      "/process": "POST - Full pipeline (transcribe + analyze)",
      "/test": "GET - Test UI",
    },
  })
);

// Transcription only (Gemini)
app.post("/transcribe", async (c) => {
  try {
    const { image, mediaType = "image/jpeg" } = await c.req.json();
    if (!image) return c.json({ success: false, error: "Missing 'image' (base64)" }, 400);
    if (typeof image !== "string") {
      return c.json({ success: false, error: "'image' must be a base64 string" }, 400);
    }
    if (typeof mediaType !== "string" || !mediaType.includes("/")) {
      return c.json({ success: false, error: "Invalid 'mediaType'" }, 400);
    }

    const maxBytes = getMaxImageBytes();
    const estimatedBytes = estimateBase64Bytes(image);
    if (estimatedBytes > maxBytes) {
      return c.json(
        { success: false, error: `Image too large (max ${maxBytes} bytes)` },
        400
      );
    }

    const result = await transcribeWithGemini(image, mediaType);

    return c.json({
      success: true,
      transcription: result.text,
      metadata: result.metadata,
      markdown: result.raw,
      provider: "gemini",
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return c.json(
      { success: false, error: "Transcription failed", details: String(error) },
      500
    );
  }
});

// Analysis only (Claude)
app.post("/analyze", async (c) => {
  try {
    const { transcription } = await c.req.json();
    if (!transcription) {
      return c.json({ success: false, error: "Missing 'transcription'" }, 400);
    }
    if (typeof transcription !== "string") {
      return c.json({ success: false, error: "'transcription' must be a string" }, 400);
    }

    const result = await analyzeWithClaude(transcription);

    return c.json({
      success: true,
      analysis: result.insights,
      provider: process.env.OPENROUTER_API_KEY ? "openrouter/claude" : "anthropic",
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return c.json(
      { success: false, error: "Analysis failed", details: String(error) },
      500
    );
  }
});

// Full pipeline
app.post("/process", async (c) => {
  try {
    const { image, mediaType = "image/jpeg", analyze = true } = await c.req.json();
    if (!image) return c.json({ success: false, error: "Missing 'image' (base64)" }, 400);
    if (typeof image !== "string") {
      return c.json({ success: false, error: "'image' must be a base64 string" }, 400);
    }
    if (typeof mediaType !== "string" || !mediaType.includes("/")) {
      return c.json({ success: false, error: "Invalid 'mediaType'" }, 400);
    }
    if (typeof analyze !== "boolean") {
      return c.json({ success: false, error: "'analyze' must be a boolean" }, 400);
    }

    const maxBytes = getMaxImageBytes();
    const estimatedBytes = estimateBase64Bytes(image);
    if (estimatedBytes > maxBytes) {
      return c.json(
        { success: false, error: `Image too large (max ${maxBytes} bytes)` },
        400
      );
    }

    // Step 1: Transcribe with Gemini
    const transcription = await transcribeWithGemini(image, mediaType);

    // Step 2: Optionally analyze with Claude
    let analysis: AnalysisResult | null = null;
    if (analyze) {
      try {
        analysis = await analyzeWithClaude(transcription.text);
      } catch (err) {
        console.warn("Analysis skipped:", err);
      }
    }

    return c.json({
      success: true,
      transcription: {
        text: transcription.text,
        metadata: transcription.metadata,
        markdown: transcription.raw,
        provider: "gemini",
      },
      analysis: analysis
        ? {
            insights: analysis.insights,
            provider: process.env.OPENROUTER_API_KEY ? "openrouter/claude" : "anthropic",
          }
        : null,
    });
  } catch (error) {
    console.error("Process error:", error);
    return c.json(
      { success: false, error: "Processing failed", details: String(error) },
      500
    );
  }
});

// Test UI
app.get("/test", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inkwell Test</title>
      <style>
        body { font-family: system-ui; max-width: 900px; margin: 2rem auto; padding: 1rem; }
        .result { white-space: pre-wrap; background: #f5f5f5; padding: 1rem; margin-top: 1rem; border-radius: 8px; }
        button { padding: 0.5rem 1rem; font-size: 1rem; cursor: pointer; margin-right: 0.5rem; }
        input { margin: 1rem 0; }
        .section { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; }
        h2 { color: #333; }
        .meta { color: #666; font-size: 0.9rem; }
      </style>
    </head>
    <body>
      <h1>🐙 Inkwell</h1>
      <p>Upload a journal page photo to transcribe and analyze.</p>
      
      <input type="file" id="file" accept="image/*" />
      <div>
        <button onclick="transcribe()">Transcribe Only</button>
        <button onclick="process()">Full Process (+ Analysis)</button>
      </div>
      
      <div id="transcription" class="section" style="display:none">
        <h2>📝 Transcription</h2>
        <div class="meta" id="transcription-meta"></div>
        <div class="result" id="transcription-result"></div>
      </div>
      
      <div id="analysis" class="section" style="display:none">
        <h2>🔍 Analysis</h2>
        <div class="result" id="analysis-result"></div>
      </div>

      <script>
        async function getImageData() {
          const file = document.getElementById('file').files[0];
          if (!file) { alert('Select an image first'); return null; }
          
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target.result.split(',')[1];
              resolve({ base64, mediaType: file.type || 'image/jpeg' });
            };
            reader.readAsDataURL(file);
          });
        }

        async function transcribe() {
          const img = await getImageData();
          if (!img) return;
          
          document.getElementById('transcription').style.display = 'block';
          document.getElementById('transcription-result').textContent = 'Transcribing...';
          document.getElementById('analysis').style.display = 'none';
          
          try {
            const res = await fetch('/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: img.base64, mediaType: img.mediaType })
            });
            const data = await res.json();
            
            if (data.success) {
              document.getElementById('transcription-meta').textContent = 
                'Provider: ' + data.provider + ' | ' + JSON.stringify(data.metadata);
              document.getElementById('transcription-result').textContent = data.markdown;
            } else {
              document.getElementById('transcription-result').textContent = JSON.stringify(data, null, 2);
            }
          } catch (err) {
            document.getElementById('transcription-result').textContent = 'Error: ' + err.message;
          }
        }

        async function process() {
          const img = await getImageData();
          if (!img) return;
          
          document.getElementById('transcription').style.display = 'block';
          document.getElementById('transcription-result').textContent = 'Processing...';
          document.getElementById('analysis').style.display = 'none';
          
          try {
            const res = await fetch('/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: img.base64, mediaType: img.mediaType, analyze: true })
            });
            const data = await res.json();
            
            if (data.success) {
              document.getElementById('transcription-meta').textContent = 
                'Provider: ' + data.transcription.provider + ' | ' + JSON.stringify(data.transcription.metadata);
              document.getElementById('transcription-result').textContent = data.transcription.markdown;
              
              if (data.analysis) {
                document.getElementById('analysis').style.display = 'block';
                document.getElementById('analysis-result').textContent = data.analysis.insights;
              }
            } else {
              document.getElementById('transcription-result').textContent = JSON.stringify(data, null, 2);
            }
          } catch (err) {
            document.getElementById('transcription-result').textContent = 'Error: ' + err.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ============================================================================
// Server
// ============================================================================

const port = Number(process.env.PORT) || 3847;

serve({ fetch: app.fetch, port }, () => {
  console.log(`🐙 Inkwell v0.2.0`);
  console.log(`   http://localhost:${port}`);
  console.log(`   Test UI: http://localhost:${port}/test`);
  console.log("");
  console.log("   Providers:");
  console.log(`   - OCR: Gemini (${process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? "✓" : "✗ missing key"})`);
  console.log(`   - Analysis: Claude via ${process.env.OPENROUTER_API_KEY ? "OpenRouter ✓" : process.env.ANTHROPIC_API_KEY ? "Anthropic API ✓" : "✗ missing key"}`);
});
