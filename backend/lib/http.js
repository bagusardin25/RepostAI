import { frontendOrigin } from "./ports.js";

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": frontendOrigin(),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
