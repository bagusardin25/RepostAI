import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "repostai-sandbox-"));
process.env.DATA_DIR = dataDir;
delete process.env.DATABASE_URL;
delete process.env.MINDS_BUILDER_API_KEY;

const { createJob, getDb, insertClips, insertVoiceEdit, listJobs, listVoiceEdits } = await import("./client.js");
const { enqueueJob } = await import("../pipeline/process.js");
const { loadVoiceMemory } = await import("../pipeline/voice.js");
const { GET: listJobsRoute } = await import("../http/jobs.js");
const { GET: voiceRoute } = await import("../http/voice.js");

const PREVIEW = "https://repostai-git-ts-pack-export-bagusardinp-3679s-projects.vercel.app";
const PRODUCTION = "https://repostai-nine.vercel.app";

after(async () => {
  (await getDb()).close();
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    // Windows can keep the SQLite file locked briefly; a leftover temp dir is harmless.
  }
});

async function seed(id, sandbox) {
  await createJob({ id, sourceType: "fixture", sourceTitle: id, transcript: "x", sandbox });
  await insertClips([
    {
      id: `${id}-clip`,
      jobId: id,
      platform: "tiktok",
      startSec: 0,
      endSec: 10,
      durationSec: 10,
      aspectRatio: "9:16",
      reason: "r",
      hook: "h",
      caption: "c",
      hashtags: [],
      videoPath: null,
    },
  ]);
  await insertVoiceEdit({
    id: `${id}-edit`,
    clipId: `${id}-clip`,
    jobId: id,
    platform: "tiktok",
    action: "reject",
    originalCaption: "c",
    note: `${id} note`,
  });
}

function request(origin) {
  return new Request("http://localhost/api", { headers: { origin } });
}

await seed("real", false);
await seed("test", true);

describe("sandbox packs", () => {
  it("stay out of the job list unless asked for", async () => {
    assert.deepEqual((await listJobs()).map((job) => job.id), ["real"]);
    assert.deepEqual((await listJobs({ includeSandbox: true })).map((job) => job.id).sort(), ["real", "test"]);
  });

  it("keep their reviews out of the saved style", async () => {
    assert.deepEqual((await listVoiceEdits()).map((edit) => edit.jobId), ["real"]);
    assert.deepEqual((await loadVoiceMemory()).rejectedReasons, ["real note"]);
    assert.deepEqual((await loadVoiceMemory({ includeSandbox: true })).rejectedReasons.sort(), [
      "real note",
      "test note",
    ]);
  });

  it("are marked when a pack is started from a preview", async () => {
    const job = await enqueueJob({ fixture: true, sandbox: true });
    assert.equal(job.sandbox, true);
    const real = await enqueueJob({ fixture: true });
    assert.equal(real.sandbox, false);
  });

  it("show on a preview desk and Style page but not in production", async () => {
    const titles = async (origin) =>
      (await (await listJobsRoute(request(origin))).json()).jobs.map((job) => job.sourceTitle);
    assert.equal((await titles(PRODUCTION)).includes("test"), false);
    assert.equal((await titles(PREVIEW)).includes("test"), true);

    const reasons = async (origin) => (await (await voiceRoute(request(origin))).json()).memory.rejectedReasons;
    assert.deepEqual(await reasons(PRODUCTION), ["real note"]);
    assert.deepEqual((await reasons(PREVIEW)).sort(), ["real note", "test note"]);
  });
});
