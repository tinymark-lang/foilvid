// api/generate.js  (Edge Function - copy entire file)
export const config = { runtime: "edge" };

const ALLOWED = process.env.ALLOWED_ORIGIN || "*";
const FRONTEND_TOKEN = process.env.FRONTEND_TOKEN || "";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-site-token",
    "Access-Control-Max-Age": "600"
  };
}

export default async function (req) {
  // Return OPTIONS preflight early (Edge uses Request/Response)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }

  // small token gate
  const token = req.headers.get("x-site-token") || "";
  if (FRONTEND_TOKEN && token !== FRONTEND_TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }

  const prompt = (body?.prompt || "").toString().trim();
  if (!prompt || prompt.length < 3) {
    return new Response(JSON.stringify({ error: "Missing prompt" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }

  try {
    // Call Replicate via server-side fetch (Edge)
    const REPLICATE_KEY = process.env.REPLICATE_API_TOKEN;
    if (!REPLICATE_KEY) {
      return new Response(JSON.stringify({ error: "Missing server token" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() }
      });
    }

    // Use Replicate REST API (works in Edge) — create a prediction
    const resp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // This payload works for many models — minimax/video-01 accepts this style
        version: "minimax/video-01", // replicate may auto-resolve; adjust if needed
        input: { prompt, aspect_ratio: "16:9", motion_level: "medium" }
      })
    });

    const j = await resp.json();
    // The replicate response structure can vary; return the whole JSON for debugging
    return new Response(JSON.stringify({ ok: true, job: j }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }
}
