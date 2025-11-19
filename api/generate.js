// api/generate.js  (replace entire file with this)
import Replicate from "replicate";

function setCorsHeaders(res, origin) {
  // origin can be '*' or e.g. 'https://foilai.in'
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-site-token");
  res.setHeader("Access-Control-Max-Age", "600");
}

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

  // ALWAYS set CORS headers (for OPTIONS and all other responses)
  setCorsHeaders(res, ALLOWED_ORIGIN);

  // Preflight -> return early with headers
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Lightweight token gate
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
    const input = { prompt: String(prompt).trim(), aspect_ratio: "16:9", motion_level: "medium" };
    const output = await replicate.run("minimax/video-01", { input });

    let url;
    if (output && typeof output.url === "function") url = output.url();
    else if (Array.isArray(output) && output.length) url = output[0];
    else if (typeof output === "string") url = output;
    else if (output?.output) url = Array.isArray(output.output) ? output.output[0] : output.output;

    if (!url) return res.status(500).json({ error: "No video URL returned", raw: output });

    return res.json({ url });
  } catch (err) {
    console.error("Generation error:", err);
    return res.status(500).json({ error: "Generation failed", details: String(err) });
  }
}
