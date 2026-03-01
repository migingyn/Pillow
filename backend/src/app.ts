import cors from "cors";
import express from "express";

const app = express();
const allowedOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Groq proxy — accepts Anthropic-shaped requests, returns Anthropic-shaped responses
app.post("/api/anthropic", async (req, res) => {
  const groqApiKey = process.env.GROQ_API_KEY ?? (req.headers["x-api-key"] as string);
  if (!groqApiKey) {
    res.status(401).json({ error: "Missing GROQ_API_KEY" });
    return;
  }

  const { max_tokens, system, messages } = req.body as {
    model?: string;
    max_tokens?: number;
    system?: string;
    messages: { role: string; content: string }[];
  };

  const groqMessages: { role: string; content: string }[] = [];
  if (system) groqMessages.push({ role: "system", content: system });
  groqMessages.push(...messages);

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: max_tokens ?? 1024,
        messages: groqMessages,
      }),
    });

    const data = (await groqRes.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message: string };
    };

    if (!groqRes.ok) {
      res.status(groqRes.status).json({ error: data.error?.message ?? "Groq error" });
      return;
    }

    const text = data.choices?.[0]?.message?.content ?? "";
    res.json({ content: [{ type: "text", text }] });
  } catch (err) {
    console.error("Groq proxy error:", err);
    res.status(500).json({ error: "Groq API request failed" });
  }
});

app.post("/api/score", (req, res) => {
  const { addr } = req.body;

  if (!groqApiKey) {
    res.status(401).json({ error: "Missing GROQ_API_KEY" });
    return;
  }

  const { max_tokens, system, messages } = req.body as {
    max_tokens?: number;
    system?: string;
    messages: { role: string; content: string }[];
  };

  const groqMessages: { role: string; content: string }[] = [];
  if (system) groqMessages.push({ role: "system", content: system });
  groqMessages.push(...messages);

  try {
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: max_tokens ?? 1024,
          messages: groqMessages,
        }),
      }
    );

    const data = (await groqRes.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message: string };
    };

    if (!groqRes.ok) {
      res.status(groqRes.status).json({ error: data.error?.message ?? "Groq error" });
      return;
    }

    const text = data.choices?.[0]?.message?.content ?? "";
    res.json({ content: [{ type: "text", text }] });
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Groq API" });
  }
});

export default app;
