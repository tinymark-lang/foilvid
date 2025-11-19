// api/generate.js  — copy this entire file
import Replicate from "replicate";

function setCorsHeaders(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-site-token");
  res.setHeader("Access-Control-Max-Age", "600");
}

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
  // ALWAYS put CORS headers on every response
  setCorsHeaders(res, ALLOWED_ORIGIN);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // token check (optional but recommended)
  if (process.env.FRONTEND_TOKEN) {
    const token = req.headers["x-site-token"] || "";
    if (token !== process.env.FRONTEND_TOKEN) {
      return res.status(401).json({ error: "Unauthorized (bad site token)" });
    }
  }

  const { prompt } = req.body || {};
  if (!prompt || String(prompt).trim().length < 3) {
    return res.status(400).json({ error: "Missing or too-short prompt" });
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const out = await replicate.run("minimax/video-01", {
      input: { prompt: String(prompt).trim(), aspect_ratio: "16:9", motion_level: "medium" }
    });

    const url =
      (typeof out?.url === "function" && out.url()) ||
      (Array.isArray(out) && out[0]) ||
      out?.output ||
      out;

    if (!url) return res.status(500).json({ error: "No video URL returned", raw: out });
    return res.json({ url });
  } catch (err) {
    console.error("Generation error:", err);
    return res.status(500).json({ error: "Generation failed", details: String(err) });
  }
}
