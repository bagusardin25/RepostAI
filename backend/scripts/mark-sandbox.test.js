import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "repostai-backfill-"));
process.env.DATA_DIR = dataDir;
delete process.env.DATABASE_URL;

const { getDb, listJobs } = await import("../db/client.js");
const { TEST_PACK_IDS, WINDOW_END, WINDOW_START, applyBackfill, findBackfill, undoBackfill } = await import(
  "./mark-sandbox.mjs"
);

after(async () => {
  (await getDb()).close();
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    // Windows can keep the SQLite file locked briefly; a leftover temp dir is harmless.
  }
});

async function insertJob(id, sourceType, createdAt) {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO jobs (id, source_type, source_title, transcript, status, created_at, updated_at)
          VALUES (?, ?, ?, '', 'ready', ?, ?)`,
    args: [id, sourceType, id, createdAt, createdAt],
  });
}

const DAY = 86400;
await insertJob("demo-in-1", "fixture", WINDOW_START + 60);
await insertJob("demo-in-2", "fixture", WINDOW_START + DAY);
await insertJob("demo-in-3", "fixture", WINDOW_END - 60);
await insertJob("demo-before", "fixture", WINDOW_START - 50 * DAY);
await insertJob("demo-after", "fixture", WINDOW_END + 60);
await insertJob("real-youtube", "youtube", WINDOW_START + DAY);
for (const id of TEST_PACK_IDS) await insertJob(id, "youtube", WINDOW_START - DAY);

const visible = async () => (await listJobs()).map((job) => job.id).sort();

describe("mark-sandbox backfill", () => {
  it("selects demo packs inside the window and the listed test packs only", async () => {
    const ids = (await findBackfill()).map((pack) => pack.id).sort();
    assert.deepEqual(ids, ["demo-in-1", "demo-in-2", "demo-in-3", ...TEST_PACK_IDS].sort());
  });

  it("refuses to change anything when the count is not the expected one", async () => {
    await assert.rejects(applyBackfill({ expect: 110 }), /Found 10 packs, expected 110/);
    assert.equal((await visible()).length, 13);
  });

  it("hides the selected packs, refuses a second apply, and undoes exactly them", async () => {
    assert.deepEqual(await applyBackfill({ expect: 10 }), { found: 10, changed: 10 });
    assert.deepEqual(await visible(), ["demo-after", "demo-before", "real-youtube"]);
    await assert.rejects(applyBackfill({ expect: 10 }), /already applied/);

    assert.deepEqual(await undoBackfill(), { changed: 10 });
    assert.equal((await visible()).length, 13);
    await assert.rejects(undoBackfill(), /No applied backfill/);
  });
});
