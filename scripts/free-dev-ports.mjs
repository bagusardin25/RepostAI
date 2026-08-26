import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function applyEnv(file) {
  if (!fs.existsSync(file)) return;
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

applyEnv(path.join(root, ".env.local"));
applyEnv(path.join(root, ".env"));

const ports = [
  Number(process.env.FRONTEND_PORT || 3000),
  Number(process.env.BACKEND_PORT || 4000),
];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function listeningPids(port) {
  if (process.platform === "win32") {
    const out = execSync("netstat -ano", { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const local = parts[1] ?? "";
      const pid = Number(parts.at(-1));
      if (pid > 0 && local.split(":").pop() === String(port)) pids.add(pid);
    }
    return [...pids];
  }

  try {
    return execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: "utf8" })
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function processInfo(pid) {
  if (process.platform === "win32") {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}'; if ($p) { Write-Output ($p.ParentProcessId.ToString() + [char]9 + $p.Name + [char]9 + $p.CommandLine) }"`,
        { encoding: "utf8" },
      ).trim();
      if (!out) return null;
      const [ppid, name, ...rest] = out.split("\t");
      return { pid, ppid: Number(ppid) || 0, name: name || "", cmd: rest.join("\t") };
    } catch {
      return null;
    }
  }

  try {
    const out = execSync(`ps -o ppid=,comm=,command= -p ${pid}`, { encoding: "utf8" }).trim();
    const match = out.match(/^\s*(\d+)\s+(\S+)\s+(.*)$/);
    if (!match) return null;
    return { pid, ppid: Number(match[1]) || 0, name: match[2], cmd: match[3] };
  } catch {
    return null;
  }
}

function isDevStack(info) {
  if (!info) return false;
  const hay = `${info.name} ${info.cmd}`.toLowerCase().replace(/\\/g, "/");
  return (
    hay.includes("repostai") ||
    hay.includes("backend/server.js") ||
    hay.includes("start-server.js") ||
    (hay.includes("next") && hay.includes("frontend")) ||
    (hay.includes("concurrently") && hay.includes("dev:backend")) ||
    (hay.includes("pnpm") && (hay.includes("dev:backend") || hay.includes("dev:frontend"))) ||
    (hay.includes("npm-cli.js") && hay.includes("run dev")) ||
    hay.includes("node --watch backend")
  );
}

function killPid(pid) {
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/F", "/T", "/PID", String(pid)], { stdio: "ignore" });
    } catch {
      // Process may already have exited with its parent.
    }
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Already gone.
  }
}

const toKill = [];
const seen = new Set();

for (const port of ports) {
  for (const pid of listeningPids(port)) {
    let current = pid;
    for (let depth = 0; depth < 10 && current && !seen.has(current); depth += 1) {
      const info = processInfo(current);
      if (!info || !isDevStack(info)) break;
      seen.add(current);
      toKill.push(current);
      current = info.ppid;
    }
  }
}

if (toKill.length === 0) process.exit(0);

console.log(`Freeing dev ports ${ports.join(" and ")} (stopping pids ${toKill.join(", ")})`);

for (const pid of toKill.slice().reverse()) {
  killPid(pid);
}

const deadline = Date.now() + 4000;
while (Date.now() < deadline) {
  const busy = ports.filter((port) => listeningPids(port).length > 0);
  if (busy.length === 0) process.exit(0);
  sleep(200);
}

const leftover = ports.flatMap((port) =>
  listeningPids(port).map((pid) => `${port} (pid ${pid})`),
);
if (leftover.length > 0) {
  console.error(`Ports still in use: ${leftover.join(", ")}`);
  process.exit(1);
}
