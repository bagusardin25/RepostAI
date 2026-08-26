import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { GET as getClip } from "./http/clip.js";
import { POST as reviewClip } from "./http/clip-review.js";
import { GET as getHealth } from "./http/health.js";
import { GET as compareJobs } from "./http/compare.js";
import { GET as getJob, POST as retryJob } from "./http/job.js";
import { GET as listJobs, POST as createJob } from "./http/jobs.js";
import { GET as getMedia } from "./http/media.js";
import { GET as getMind, POST as postMind } from "./http/mind.js";
import { GET as getVoice } from "./http/voice.js";
import { GET as getWatch, POST as postWatch } from "./http/watch.js";
import { startWatchLoop } from "./pipeline/watch.js";
import { corsHeaders, json } from "./lib/http.js";
import {
  assertDistinctPorts,
  BACKEND_PORT,
  backendOrigin,
  FRONTEND_PORT,
  frontendOrigin,
} from "./lib/ports.js";

loadEnvFiles();
assertDistinctPorts();

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal server error" }));
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Backend port ${BACKEND_PORT} is already in use. Frontend is ${FRONTEND_PORT}. Pick another BACKEND_PORT.`,
    );
    process.exit(1);
  }
  throw error;
});

server.listen(BACKEND_PORT, "127.0.0.1", () => {
  console.log(`backend  ${backendOrigin()}`);
  console.log(`frontend  ${frontendOrigin()}  (expected)`);
  startWatchLoop();
});

async function handle(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  const request = await toWebRequest(req);
  const url = new URL(request.url);
  const response = (await route(request, url)) ?? json({ error: "Not found" }, 404);
  await writeResponse(res, response);
}

async function route(request, url) {
  const method = request.method;
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  if (pathname === "/api/health" && method === "GET") return getHealth();
  if (pathname === "/api/jobs" && method === "GET") return listJobs();
  if (pathname === "/api/jobs" && method === "POST") return createJob(request);
  if (pathname === "/api/jobs/compare" && method === "GET") return compareJobs(request);
  if (pathname === "/api/voice" && method === "GET") return getVoice();
  if (pathname === "/api/mind/history" && method === "GET") return getMind(request);
  if (pathname === "/api/mind/messages" && method === "POST") return postMind(request);
  if (pathname === "/api/mind/skills" && method === "POST") return postMind(request);
  if (pathname === "/api/mind/tenets" && method === "POST") return postMind(request);
  if (pathname === "/api/mind" && method === "GET") return getMind(request);
  if (pathname === "/api/watch/poll" && method === "POST") return postWatch(request);
  if (pathname === "/api/watch" && method === "GET") return getWatch();
  if (pathname === "/api/watch" && method === "POST") return postWatch(request);

  const job = pathname.match(/^\/api\/jobs\/([^/]+)$/);
  if (job && method === "GET") return getJob(request, { id: job[1] });
  if (job && method === "POST") return retryJob(request, { id: job[1] });

  const clipReview = pathname.match(/^\/api\/clips\/([^/]+)\/review$/);
  if (clipReview && method === "POST") return reviewClip(request, { id: clipReview[1] });

  const clip = pathname.match(/^\/api\/clips\/([^/]+)$/);
  if (clip && method === "GET") return getClip(request, { id: clip[1] });

  const media = pathname.match(/^\/api\/media\/([^/]+)\/([^/]+)$/);
  if (media && method === "GET") {
    return getMedia(request, { kind: media[1], filename: media[2] });
  }

  return null;
}

async function toWebRequest(req) {
  const host = req.headers.host ?? `127.0.0.1:${BACKEND_PORT}`;
  const url = `http://${host}${req.url ?? "/"}`;
  const method = req.method ?? "GET";
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    Object.assign(init, {
      body: Readable.toWeb(req),
      duplex: "half",
    });
  }
  return new Request(url, init);
}

async function writeResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}

function loadEnvFiles() {
  const cwd = process.cwd();
  const files = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
    path.join(cwd, "frontend", ".env.local"),
    path.join(cwd, "frontend", ".env"),
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
