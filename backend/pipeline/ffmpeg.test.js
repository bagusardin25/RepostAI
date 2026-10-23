import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { copyCachedClip, copyFixtureVideo, createLimiter, fixtureClipCacheKey } from "./ffmpeg.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("ffmpeg limiter", () => {
  it("never runs more than the limit at once and keeps every result", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let peak = 0;
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        limit(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await wait(10);
          active -= 1;
          return n * 10;
        }),
      ),
    );
    assert.equal(peak, 2);
    assert.deepEqual(results, [10, 20, 30, 40, 50]);
  });

  it("keeps draining the queue after a task fails", async () => {
    const limit = createLimiter(1);
    const failed = limit(async () => {
      throw new Error("boom");
    });
    const next = limit(async () => "ok");
    await assert.rejects(failed, /boom/);
    assert.equal(await next, "ok");
  });
});

describe("copyFixtureVideo", () => {
  it("renders the sample video once and gives each pack its own copy", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repostai-fixture-"));
    let renders = 0;
    const render = async (outputPath) => {
      renders += 1;
      await wait(20);
      fs.writeFileSync(outputPath, "fake-video");
    };
    try {
      const outputs = ["a", "b", "c"].map((id) => path.join(dir, `${id}.mp4`));
      await Promise.all(outputs.map((output) => copyFixtureVideo(output, 96, dir, render)));
      await copyFixtureVideo(path.join(dir, "d.mp4"), 96, dir, render);

      assert.equal(renders, 1);
      for (const output of [...outputs, path.join(dir, "d.mp4")]) {
        assert.equal(fs.readFileSync(output, "utf8"), "fake-video");
      }
      fs.rmSync(outputs[0]);
      assert.ok(fs.existsSync(path.join(dir, "fixture-96s.mp4")), "deleting a pack keeps the cached render");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("retries the render after a failure and leaves no temp file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repostai-fixture-"));
    let attempts = 0;
    const render = async (outputPath) => {
      attempts += 1;
      fs.writeFileSync(outputPath, "partial");
      if (attempts === 1) throw new Error("pthread_create failed");
    };
    try {
      await assert.rejects(copyFixtureVideo(path.join(dir, "a.mp4"), 28, dir, render), /pthread_create/);
      assert.deepEqual(fs.readdirSync(dir), []);
      await copyFixtureVideo(path.join(dir, "b.mp4"), 28, dir, render);
      assert.equal(attempts, 2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("copyCachedClip", () => {
  it("names a demo clip from its window without a colon", () => {
    assert.equal(
      fixtureClipCacheKey({ startSec: 1.25, endSec: 12, aspectRatio: "9:16" }),
      "fixture-clip-1250-12000-916",
    );
  });

  it("cuts a shared window once and gives each pack its own file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repostai-clip-"));
    let cuts = 0;
    const render = async (outputPath) => {
      cuts += 1;
      await wait(20);
      fs.writeFileSync(outputPath, "clip");
    };
    const key = fixtureClipCacheKey({ startSec: 0, endSec: 8, aspectRatio: "9:16" });
    try {
      const outputs = ["a", "b", "c"].map((id) => path.join(dir, `${id}.mp4`));
      await Promise.all(outputs.map((output) => copyCachedClip(output, key, dir, render)));
      assert.equal(cuts, 1);
      for (const output of outputs) assert.equal(fs.readFileSync(output, "utf8"), "clip");
      fs.rmSync(outputs[0]);
      assert.ok(fs.existsSync(path.join(dir, `${key}.mp4`)));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("cuts a different window again", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repostai-clip-"));
    let cuts = 0;
    const render = async (outputPath) => {
      cuts += 1;
      fs.writeFileSync(outputPath, String(cuts));
    };
    try {
      await copyCachedClip(path.join(dir, "a.mp4"), "fixture-clip-0-8000-916", dir, render);
      await copyCachedClip(path.join(dir, "b.mp4"), "fixture-clip-8000-16000-916", dir, render);
      assert.equal(cuts, 2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
