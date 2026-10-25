// One-time backfill for packs that TestSprite created through pull request previews before
// sandbox flags existed: it marks them sandbox so the production desk and Style page leave them
// (and their reviews) out. Nothing is deleted, and --undo puts back exactly what --apply changed.
//
//   node backend/scripts/mark-sandbox.mjs              dry run: list what would change
//   node backend/scripts/mark-sandbox.mjs --apply      mark them (stops unless it finds 110 packs)
//   node backend/scripts/mark-sandbox.mjs --undo       unmark the packs the last --apply marked
//
// Pass --expect=<n> to --apply only after checking a dry run that found a different count.

import { pathToFileURL } from "node:url";
import { getDb, getSetting, setSetting } from "../db/client.js";

// Every demo-sample pack from the first TestSprite run to the end of run 3 on #4.
export const WINDOW_START = Date.parse("2026-10-20T00:00:00+07:00") / 1000;
export const WINDOW_END = Date.parse("2026-10-23T22:45:00+07:00") / 1000;

// Test packs that were not the demo sample, picked by hand.
export const TEST_PACK_IDS = [
  "14daf293-11a5-44ad-af5b-56690f311f46", // Astronaut Q&A with Florida Students (18 Oct)
  "258859ff-6c8e-479c-9e66-121d4cef6089", // Mars and Earth, Alike as Two Peas in a Pod? (19 Oct)
  "bc184c7f-95f0-439f-86dd-4bc88261a2bc", // What Can Astronauts See From Space? (19 Oct)
  "45a2cb61-bb56-475d-9d02-5bd0a42db82c", // Upload without captions (expected to fail) (20 Oct)
  "bf25b083-5bf6-4538-88b1-d770187eddac", // YouTube video, failed (21 Oct)
  "5008c087-8f06-410e-a660-272b93c80ddd", // Rick Astley (21 Oct)
  "98857355-cc6b-466a-98c1-8b8832d79ed4", // Rick Astley (23 Oct)
];

export const EXPECTED_COUNT = 110;
export const SETTING_KEY = "sandbox_backfill_2026_10";

export async function findBackfill() {
  const db = await getDb();
  const marks = TEST_PACK_IDS.map(() => "?").join(", ");
  const result = await db.execute({
    sql: `SELECT id, source_type, source_title, created_at, sandbox FROM jobs
          WHERE (source_type = 'fixture' AND created_at BETWEEN ? AND ?) OR id IN (${marks})
          ORDER BY created_at`,
    args: [WINDOW_START, WINDOW_END, ...TEST_PACK_IDS],
  });
  return result.rows.map((row) => ({
    id: String(row.id),
    sourceType: String(row.source_type),
    title: String(row.source_title),
    createdAt: Number(row.created_at),
    sandbox: Boolean(row.sandbox),
  }));
}

async function setSandbox(ids, value) {
  const db = await getDb();
  let changed = 0;
  for (const id of ids) {
    const result = await db.execute({ sql: "UPDATE jobs SET sandbox = ? WHERE id = ?", args: [value, id] });
    changed += result.rowsAffected ?? 0;
  }
  return changed;
}

export async function applyBackfill({ expect = EXPECTED_COUNT } = {}) {
  const saved = await getSetting(SETTING_KEY);
  if (saved && (JSON.parse(saved).ids ?? []).length > 0) {
    throw new Error("The backfill is already applied. Run --undo first if you need to apply it again.");
  }
  const packs = await findBackfill();
  if (packs.length !== expect) {
    throw new Error(`Found ${packs.length} packs, expected ${expect}. Nothing changed; check a dry run first.`);
  }
  const ids = packs.filter((pack) => !pack.sandbox).map((pack) => pack.id);
  const changed = await setSandbox(ids, 1);
  await setSetting(SETTING_KEY, JSON.stringify({ appliedAt: new Date().toISOString(), ids }));
  return { found: packs.length, changed };
}

export async function undoBackfill() {
  const saved = await getSetting(SETTING_KEY);
  const ids = saved ? JSON.parse(saved).ids ?? [] : [];
  if (ids.length === 0) throw new Error("No applied backfill to undo.");
  const changed = await setSandbox(ids, 0);
  await setSetting(SETTING_KEY, JSON.stringify({ undoneAt: new Date().toISOString(), ids: [] }));
  return { changed };
}

function wib(unixSec) {
  return new Date((unixSec + 7 * 3600) * 1000).toISOString().replace("T", " ").slice(0, 16);
}

async function main() {
  const args = process.argv.slice(2);
  const expectArg = args.find((arg) => arg.startsWith("--expect="));
  const expect = expectArg ? Number(expectArg.split("=")[1]) : EXPECTED_COUNT;
  const db = await getDb();

  if (args.includes("--undo")) {
    const { changed } = await undoBackfill();
    console.log(`Unmarked ${changed} packs. They show in production again.`);
    db.close();
    return;
  }

  const packs = await findBackfill();
  const demo = packs.filter((pack) => pack.sourceType === "fixture");
  const others = packs.filter((pack) => pack.sourceType !== "fixture");
  const total = Number((await db.execute("SELECT COUNT(*) AS n FROM jobs")).rows[0].n);
  const alreadyHidden = Number((await db.execute("SELECT COUNT(*) AS n FROM jobs WHERE sandbox = 1")).rows[0].n);
  const newlyHidden = packs.filter((pack) => !pack.sandbox).length;

  console.log(`Packs in the database: ${total} (already sandbox: ${alreadyHidden})`);
  console.log(`Selected: ${packs.length} (expected ${expect})`);
  console.log(`  demo sample packs ${wib(WINDOW_START)} to ${wib(WINDOW_END)} WIB: ${demo.length}`);
  console.log(`  other test packs by id: ${others.length} of ${TEST_PACK_IDS.length}`);
  for (const pack of others) console.log(`    ${wib(pack.createdAt)}  ${pack.sourceType}  ${pack.title.slice(0, 60)}`);
  console.log(`Production desk after --apply: ${total - alreadyHidden - newlyHidden} packs`);

  if (!args.includes("--apply")) {
    console.log("Dry run: nothing changed. Run again with --apply to mark them.");
    db.close();
    return;
  }

  const { changed } = await applyBackfill({ expect });
  console.log(`Marked ${changed} packs as sandbox. Undo with --undo.`);
  db.close();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
