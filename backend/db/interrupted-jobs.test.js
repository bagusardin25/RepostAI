import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "repostai-db-"));
process.env.DATA_DIR = dataDir;
delete process.env.DATABASE_URL;

const { createJob, failInterruptedJobs, getJob, getDb, updateJob } = await import("./client.js");

after(async () => {
  (await getDb()).close();
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    // Windows can keep the SQLite file locked briefly; a leftover temp dir is harmless.
  }
});

describe("failInterruptedJobs", () => {
  it("fails only jobs that were still in progress", async () => {
    const states = ["queued", "fetching_source", "analyzing", "clipping", "ready", "failed"];
    for (const status of states) {
      await createJob({ id: status, sourceType: "fixture", sourceTitle: status, transcript: "x" });
      await updateJob(status, { status });
    }

    const count = await failInterruptedJobs("Processing was interrupted. Retry this pack.");
    assert.equal(count, 4);

    for (const status of ["queued", "fetching_source", "analyzing", "clipping"]) {
      const job = await getJob(status);
      assert.equal(job.status, "failed");
      assert.equal(job.error, "Processing was interrupted. Retry this pack.");
    }
    assert.equal((await getJob("ready")).status, "ready");
    assert.equal((await getJob("failed")).error, null);
  });
});
