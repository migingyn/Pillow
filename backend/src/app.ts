import { spawn } from "child_process";
import cors from "cors";
import express from "express";

const app = express();
const allowedOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.post("/api/score", (req, res) => {
  const { addr } = req.body;

  const pythonProcess = spawn("python", ["model.py", addr]);

  let result = "";

  pythonProcess.stdout.on("data", (data) => {
    result += data.toString();
  });

  pythonProcess.on("close", (code) => {
    console.log(`Python process exited with code ${code}`);
    try {
      const finalScore = JSON.parse(result);
      res.json(finalScore);
    } catch {
      res.status(500).json({ error: "ML model failed to produce JSON" });
    }
  });
});

export default app;
