import { Hono } from "hono";
import { cors } from "hono/cors";
import Anthropic from "@anthropic-ai/sdk";

const app = new Hono();
const anthropic = new Anthropic();

app.use("/*", cors());

const TRANSCRIBE_PROMPT = `You are a journal transcription assistant. Analyze this handwritten journal page and:

1. **Transcribe** the handwritten text as accurately as possible
2. **Detect the date** if visible (from the writing or page context)
3. **Extract key themes** (2-5 themes mentioned)
4. **Note any mood indicators** (explicit or implicit)
5. **Identify any people, places, or specific items mentioned**

Output format (markdown):

---
date: [YYYY-MM-DD or "unknown"]
mood: [detected mood, or "neutral"]
themes: [comma-separated list]
people: [comma-separated list, or "none"]
places: [comma-separated list, or "none"]
confidence: [high/medium/low - your confidence in the transcription]
---

## Transcription

[The transcribed text, preserving paragraph breaks. Use [unclear] for illegible words.]

## Notes

[Any observations: corrections made, context inferred, patterns noticed]
`;

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "inkwell" }));

// Transcribe endpoint - accepts base64 image
app.post("/transcribe", async (c) => {
  try {
    const body = await c.req.json();
    const { image, mediaType = "image/jpeg" } = body;

    if (!image) {
      return c.json({ error: "Missing 'image' field (base64 encoded)" }, 400);
    }

    // Call Claude Vision
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: image,
              },
            },
            {
              type: "text",
              text: TRANSCRIBE_PROMPT,
            },
          ],
        },
      ],
    });

    const transcription =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse frontmatter for structured response
    const frontmatterMatch = transcription.match(/^---\n([\s\S]*?)\n---/);
    let metadata: Record<string, string> = {};

    if (frontmatterMatch) {
      const lines = frontmatterMatch[1].split("\n");
      for (const line of lines) {
        const [key, ...valueParts] = line.split(": ");
        if (key && valueParts.length) {
          metadata[key.trim()] = valueParts.join(": ").trim();
        }
      }
    }

    return c.json({
      success: true,
      markdown: transcription,
      metadata,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return c.json(
      {
        error: "Transcription failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Simple form upload for testing
app.get("/test", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inkwell Test</title>
      <style>
        body { font-family: system-ui; max-width: 800px; margin: 2rem auto; padding: 1rem; }
        #result { white-space: pre-wrap; background: #f5f5f5; padding: 1rem; margin-top: 1rem; }
        button { padding: 0.5rem 1rem; font-size: 1rem; cursor: pointer; }
        input { margin: 1rem 0; }
      </style>
    </head>
    <body>
      <h1>🐙 Inkwell Test</h1>
      <p>Upload a journal page photo to transcribe:</p>
      <input type="file" id="file" accept="image/*" />
      <button onclick="transcribe()">Transcribe</button>
      <div id="result"></div>
      <script>
        async function transcribe() {
          const file = document.getElementById('file').files[0];
          if (!file) { alert('Select an image first'); return; }
          
          const result = document.getElementById('result');
          result.textContent = 'Transcribing...';
          
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64 = e.target.result.split(',')[1];
            const mediaType = file.type || 'image/jpeg';
            
            try {
              const res = await fetch('/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64, mediaType })
              });
              const data = await res.json();
              result.textContent = data.success ? data.markdown : JSON.stringify(data, null, 2);
            } catch (err) {
              result.textContent = 'Error: ' + err.message;
            }
          };
          reader.readAsDataURL(file);
        }
      </script>
    </body>
    </html>
  `);
});

import { serve } from "@hono/node-server";

const port = Number(process.env.PORT) || 3847;

serve({ fetch: app.fetch, port }, () => {
  console.log(`🐙 Inkwell listening on http://localhost:${port}`);
  console.log(`   Test UI: http://localhost:${port}/test`);
});
