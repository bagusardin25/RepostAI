import { FRONTEND_PORT } from "./ports.js";

function allowedOrigins() {
  const raw = process.env.FRONTEND_ORIGIN?.trim();
  if (raw === "*") return ["*"];
  const listed = (raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return [
    ...new Set([
      `http://localhost:${FRONTEND_PORT}`,
      `http://127.0.0.1:${FRONTEND_PORT}`,
      ...listed,
    ]),
  ];
}

function resolveOrigin(requestOrigin = "") {
  const allowed = allowedOrigins();
  if (allowed.includes("*")) return "*";
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
  const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS !== "false";
  if (allowVercelPreviews && requestOrigin && /\.vercel\.app$/.test(requestOrigin)) {
    return requestOrigin;
  }
  return allowed[0];
}

export function corsHeaders(requestOrigin = "") {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(requestOrigin),
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(data, status = 200) {
  return Response.json(data, { status, headers: corsHeaders() });
}

export function defer(work) {
  setImmediate(() => {
    work().catch((error) => console.error(error));
  });
}
