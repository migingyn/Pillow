#!/usr/bin/env node
// ClearNest — local proxy (Groq backend)
// Usage: GROQ_API_KEY=gsk_... node proxy.js
// Free key: https://console.groq.com
// Then open http://localhost:3000

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const API_KEY = process.env.GROQ_API_KEY || "";

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".geojson": "application/json",
  ".png": "image/png",
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Proxy: POST /api/anthropic → Groq /openai/v1/chat/completions
  if (req.method === "POST" && req.url === "/api/anthropic") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const bodyBuf = Buffer.concat(chunks);
      const key = API_KEY || req.headers["x-api-key"] || "";

      if (!key) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error:
              "No API key. Start server with: GROQ_API_KEY=gsk_... node proxy.js",
          }),
        );
        return;
      }

      // Parse incoming Anthropic-format body and convert to OpenAI format
      let incoming;
      try {
        incoming = JSON.parse(bodyBuf.toString());
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON: " + e.message }));
        return;
      }

      // Convert Anthropic messages format → OpenAI format
      const messages = [];
      if (incoming.system)
        messages.push({ role: "system", content: incoming.system });
      for (const m of incoming.messages || [])
        messages.push({ role: m.role, content: m.content });

      const groqBody = JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: incoming.max_tokens || 1024,
        messages,
      });

      const groqBuf = Buffer.from(groqBody);

      const options = {
        hostname: "api.groq.com",
        path: "/openai/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "Content-Length": groqBuf.length,
        },
      };

      console.log(`[-> Groq] ${groqBuf.length} bytes`);

      const proxyReq = https.request(options, (proxyRes) => {
        const respChunks = [];
        proxyRes.on("data", (chunk) => respChunks.push(chunk));
        proxyRes.on("end", () => {
          const respBuf = Buffer.concat(respChunks);

          if (proxyRes.statusCode !== 200) {
            console.error(
              `[<- Groq ${proxyRes.statusCode}]`,
              respBuf.toString(),
            );
            res.writeHead(proxyRes.statusCode, {
              "Content-Type": "application/json",
            });
            res.end(respBuf);
            return;
          }

          console.log(
            `[<- Groq ${proxyRes.statusCode}] ${respBuf.length} bytes`,
          );

          // Convert OpenAI response → Anthropic response format so frontend needs no changes
          let groqResp;
          try {
            groqResp = JSON.parse(respBuf.toString());
          } catch (e) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Bad JSON from Groq" }));
            return;
          }

          const text = groqResp.choices?.[0]?.message?.content || "";
          const anthropicShape = {
            id: groqResp.id,
            type: "message",
            role: "assistant",
            content: [{ type: "text", text }],
            model: groqResp.model,
            stop_reason: "end_turn",
            usage: {
              input_tokens: groqResp.usage?.prompt_tokens || 0,
              output_tokens: groqResp.usage?.completion_tokens || 0,
            },
          };

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(anthropicShape));
        });
      });

      proxyReq.on("error", (e) => {
        console.error("[Proxy error]", e.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      });

      proxyReq.write(groqBuf);
      proxyReq.end();
    });
    return;
  }

  // ── Static file server
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found: " + req.url);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const keyStatus = API_KEY ? "set via env var      " : "not set (pass in UI)";
  console.log(`
  +--------------------------------------+
  |   ClearNest proxy running (Groq)     |
  |   http://localhost:${PORT}               |
  |   Free key: console.groq.com         |
  |                                      |
  |   API key: ${keyStatus}   |
  +--------------------------------------+
  `);
});
