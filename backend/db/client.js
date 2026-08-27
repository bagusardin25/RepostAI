import { createClient } from "@libsql/client";
import { pathToFileURL } from "node:url";
import { dbFile, ensureDataDirs } from "../lib/paths.js";

let ready = null;

function sqliteUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return pathToFileURL(dbFile()).href;
  if (/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error(
      "DATABASE_URL is a Postgres URL, but RepostAI uses SQLite via @libsql/client. Leave DATABASE_URL unset and attach a Railway volume at /data.",
    );
  }
  return url;
}

async function connect() {
  ensureDataDirs();
  const client = createClient({ url: sqliteUrl() });
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_url TEXT,
      source_title TEXT NOT NULL,
      source_video_path TEXT,
      transcript TEXT NOT NULL DEFAULT '',
      duration_sec INTEGER,
      status TEXT NOT NULL DEFAULT 'queued',
      error TEXT,
      analyzer TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clips (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      platform TEXT NOT NULL,
      start_sec INTEGER NOT NULL,
      end_sec INTEGER NOT NULL,
      duration_sec INTEGER NOT NULL,
      aspect_ratio TEXT NOT NULL,
      reason TEXT NOT NULL,
      hook TEXT NOT NULL,
      caption TEXT NOT NULL,
      hashtags TEXT NOT NULL DEFAULT '[]',
      video_path TEXT,
      status TEXT NOT NULL DEFAULT 'needs_review',
      edited_caption TEXT,
      edited_hook TEXT,
      review_note TEXT,
      created_at INTEGER NOT NULL,
      reviewed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS voice_edits (
      id TEXT PRIMARY KEY,
      clip_id TEXT NOT NULL REFERENCES clips(id),
      job_id TEXT NOT NULL REFERENCES jobs(id),
      platform TEXT NOT NULL,
      action TEXT NOT NULL,
      original_caption TEXT NOT NULL,
      edited_caption TEXT,
      note TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS clips_job_id_idx ON clips(job_id);
    CREATE INDEX IF NOT EXISTS voice_edits_created_at_idx ON voice_edits(created_at);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  await ensureColumn(client, "jobs", "followup", "TEXT");
  await ensureColumn(client, "jobs", "artifacts", "TEXT");
  await ensureColumn(client, "jobs", "voice_applied", "TEXT");
  await ensureColumn(client, "voice_edits", "original_hook", "TEXT");
  await ensureColumn(client, "voice_edits", "edited_hook", "TEXT");
  return client;
}

async function ensureColumn(client, table, column, ddl) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some((row) => row.name === column || row[1] === column);
  if (exists) return;
  try {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column/i.test(message)) throw error;
  }
}

export function getDb() {
  if (!ready) ready = connect();
  return ready;
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function parseHashtags(raw) {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

function parseJson(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function mapJob(row) {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    sourceVideoPath: row.source_video_path,
    transcript: row.transcript,
    durationSec: row.duration_sec,
    status: row.status,
    error: row.error,
    analyzer: row.analyzer ?? null,
    followup: parseJson(row.followup, null),
    artifacts: parseJson(row.artifacts, null),
    voiceApplied: parseJson(row.voice_applied, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClip(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    platform: row.platform,
    startSec: row.start_sec,
    endSec: row.end_sec,
    durationSec: row.duration_sec,
    aspectRatio: row.aspect_ratio,
    reason: row.reason,
    hook: row.hook,
    caption: row.caption,
    hashtags: parseHashtags(row.hashtags),
    videoPath: row.video_path,
    status: row.status,
    editedCaption: row.edited_caption,
    editedHook: row.edited_hook,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function createJob(input) {
  const db = await getDb();
  const ts = now();
  await db.execute({
    sql: `INSERT INTO jobs (
      id, source_type, source_url, source_title, source_video_path,
      transcript, duration_sec, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)`,
    args: [
      input.id,
      input.sourceType,
      input.sourceUrl ?? null,
      input.sourceTitle,
      input.sourceVideoPath ?? null,
      input.transcript ?? "",
      input.durationSec ?? null,
      ts,
      ts,
    ],
  });
  return getJob(input.id);
}

export async function getJob(id) {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM jobs WHERE id = ? LIMIT 1", args: [id] });
  return result.rows[0] ? mapJob(result.rows[0]) : null;
}

export async function listJobs() {
  const db = await getDb();
  const result = await db.execute("SELECT * FROM jobs");
  return result.rows
    .map(mapJob)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ transcript, artifacts, ...rest }) => ({
      ...rest,
      hasTranscript: Boolean(transcript && transcript.length > 0),
      hasArtifacts: Boolean(artifacts),
    }));
}

export async function updateJob(id, patch) {
  const columns = {
    sourceTitle: "source_title",
    sourceVideoPath: "source_video_path",
    transcript: "transcript",
    durationSec: "duration_sec",
    status: "status",
    error: "error",
    analyzer: "analyzer",
    followup: "followup",
    artifacts: "artifacts",
    voiceApplied: "voice_applied",
  };
  const sets = [];
  const args = [];
  for (const [key, column] of Object.entries(columns)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`);
      const value =
        (key === "followup" || key === "artifacts" || key === "voiceApplied") &&
        patch[key] != null &&
        typeof patch[key] !== "string"
          ? JSON.stringify(patch[key])
          : patch[key];
      args.push(value);
    }
  }
  sets.push("updated_at = ?");
  args.push(now(), id);
  const db = await getDb();
  await db.execute({
    sql: `UPDATE jobs SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function insertClips(records) {
  if (records.length === 0) return;
  const db = await getDb();
  const ts = now();
  for (const record of records) {
    await db.execute({
      sql: `INSERT INTO clips (
        id, job_id, platform, start_sec, end_sec, duration_sec, aspect_ratio,
        reason, hook, caption, hashtags, video_path, status,
        edited_caption, edited_hook, review_note, created_at, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_review', ?, ?, ?, ?, NULL)`,
      args: [
        record.id,
        record.jobId,
        record.platform,
        record.startSec,
        record.endSec,
        record.durationSec,
        record.aspectRatio,
        record.reason,
        record.hook,
        record.caption,
        JSON.stringify(record.hashtags),
        record.videoPath,
        record.editedCaption ?? null,
        record.editedHook ?? null,
        record.reviewNote ?? null,
        ts,
      ],
    });
  }
}

export async function listClipsForJob(jobId) {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM clips WHERE job_id = ?", args: [jobId] });
  return result.rows.map(mapClip).sort((a, b) => a.startSec - b.startSec);
}

export async function getClip(id) {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM clips WHERE id = ? LIMIT 1", args: [id] });
  return result.rows[0] ? mapClip(result.rows[0]) : null;
}

export async function updateClipReview(id, patch) {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE clips SET status = ?, edited_caption = ?, edited_hook = ?, review_note = ?, reviewed_at = ? WHERE id = ?`,
    args: [
      patch.status,
      patch.editedCaption ?? null,
      patch.editedHook ?? null,
      patch.reviewNote ?? null,
      now(),
      id,
    ],
  });
}

export async function insertVoiceEdit(record) {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO voice_edits (
      id, clip_id, job_id, platform, action, original_caption, edited_caption, note, created_at,
      original_hook, edited_hook
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      record.id,
      record.clipId,
      record.jobId,
      record.platform,
      record.action,
      record.originalCaption,
      record.editedCaption ?? null,
      record.note ?? null,
      now(),
      record.originalHook ?? null,
      record.editedHook ?? null,
    ],
  });
}

export async function listVoiceEdits(limit = 40, beforeSec = null) {
  const db = await getDb();
  const result = await db.execute("SELECT * FROM voice_edits");
  return result.rows
    .map((row) => ({
      id: row.id,
      clipId: row.clip_id,
      jobId: row.job_id,
      platform: row.platform,
      action: row.action,
      originalCaption: row.original_caption,
      editedCaption: row.edited_caption,
      originalHook: row.original_hook ?? null,
      editedHook: row.edited_hook ?? null,
      note: row.note,
      createdAt: row.created_at,
    }))
    .filter((row) => beforeSec == null || row.createdAt < beforeSec)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function getSetting(key) {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT value FROM settings WHERE key = ? LIMIT 1",
    args: [key],
  });
  return result.rows[0]?.value ?? null;
}

export async function setSetting(key, value) {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO settings (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [key, value ?? ""],
  });
}
