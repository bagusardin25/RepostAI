import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "repostai-db-"));
process.env.DATA_DIR = dataDir;
delete process.env.DATABASE_URL;
delete process.env.MINDS_BUILDER_API_KEY;

const { createJob, deleteJob, failInterruptedJobs, getJob, getDb, listClipsForJob, updateJob } =
  await import("./client.js");
const { processJob } = await import("../pipeline/process.js");
const { FIXTURE_DURATION_SEC, FIXTURE_TRANSCRIPT } = await import("../pipeline/fixture.js");

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

describe("processJob", () => {
  it("stops quietly when the pack is deleted while it runs", async () => {
    await createJob({
      id: "deleted-mid-run",
      sourceType: "upload",
      sourceTitle: "Deleted mid-run",
      transcript: FIXTURE_TRANSCRIPT,
      durationSec: FIXTURE_DURATION_SEC,
    });

    const outcome = processJob("deleted-mid-run").then(
      () => "finished",
      (error) => error,
    );
    await deleteJob("deleted-mid-run");

    assert.equal(await outcome, "finished");
    assert.equal(await getJob("deleted-mid-run"), null);
    assert.deepEqual(await listClipsForJob("deleted-mid-run"), []);
  });
});
