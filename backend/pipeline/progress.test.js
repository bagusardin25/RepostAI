import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearProgress, getProgress, setProgress } from "./progress.js";

describe("live progress", () => {
  it("returns null for jobs that are not running", () => {
    assert.equal(getProgress("missing"), null);
  });

  it("stamps the stage start and merges later steps", () => {
    setProgress("job-a", { stage: "fetching_source", step: "captions" });
    const first = getProgress("job-a");
    assert.equal(first.stage, "fetching_source");
    assert.equal(typeof first.stageStartedAt, "number");
    assert.equal(typeof first.serverNow, "number");

    setProgress("job-a", { step: "download", bytes: 1024 });
    const second = getProgress("job-a");
    assert.equal(second.step, "download");
    assert.equal(second.bytes, 1024);
    assert.equal(second.stageStartedAt, first.stageStartedAt);
    clearProgress("job-a");
  });

  it("drops counters from the previous stage", () => {
    setProgress("job-b", { stage: "fetching_source", step: "download", bytes: 4096 });
    setProgress("job-b", { stage: "clipping", step: "cutting", done: 0, total: 3 });
    const clipping = getProgress("job-b");
    assert.equal(clipping.bytes, undefined);
    assert.equal(clipping.done, 0);
    assert.equal(clipping.total, 3);
    clearProgress("job-b");
    assert.equal(getProgress("job-b"), null);
  });
});
