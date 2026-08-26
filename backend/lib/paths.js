import fs from "node:fs";
import path from "node:path";

function repoRoot() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "backend")) && fs.existsSync(path.join(cwd, "frontend"))) {
    return cwd;
  }
  const parent = path.join(cwd, "..");
  if (fs.existsSync(path.join(parent, "backend")) && fs.existsSync(path.join(parent, "frontend"))) {
    return parent;
  }
  return cwd;
}

export function dataRoot() {
  return path.join(repoRoot(), "data");
}

export function sourcesDir() {
  return path.join(dataRoot(), "sources");
}

export function clipsDir() {
  return path.join(dataRoot(), "clips");
}

export function uploadsDir() {
  return path.join(dataRoot(), "uploads");
}

export function dbFile() {
  return path.join(dataRoot(), "repostai.db");
}

export function ensureDataDirs() {
  for (const dir of [dataRoot(), sourcesDir(), clipsDir(), uploadsDir()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function safeJoin(root, filename) {
  const base = path.basename(filename);
  if (!base || base !== filename || base.includes("..")) {
    throw new Error("Invalid filename");
  }
  return path.join(root, base);
}
