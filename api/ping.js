// api/ping.js
export default function handler(req, res) {
  // Always return CORS headers for diagnostics
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-site-token");
  if (req.method === "OPTIONS") return res.status(204).end();
  res.json({ ok: true, ts: new Date().toISOString() });
}
