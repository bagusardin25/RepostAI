import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import {
  cuesToTranscript,
  extractYoutubeId,
  parseJson3Captions,
  parseXmlCaptions,
  pickCaptionTrack,
  withTimeout,
  writeDownloadStream,
} from "./youtube.js";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "repostai-yt-"));
after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

describe("extractYoutubeId", () => {
  it("reads watch, short, and bare ids", () => {
    assert.equal(extractYoutubeId("jNQXAC9IVRw"), "jNQXAC9IVRw");
    assert.equal(extractYoutubeId("https://youtu.be/jNQXAC9IVRw?si=abc"), "jNQXAC9IVRw");
    assert.equal(extractYoutubeId("https://www.youtube.com/watch?v=jNQXAC9IVRw&t=12"), "jNQXAC9IVRw");
    assert.equal(extractYoutubeId("https://www.youtube.com/shorts/jNQXAC9IVRw"), "jNQXAC9IVRw");
    assert.equal(extractYoutubeId("https://www.youtube.com/live/jNQXAC9IVRw"), "jNQXAC9IVRw");
  });
});

describe("caption parsers", () => {
  it("parses json3 events", () => {
    const cues = parseJson3Captions(
      JSON.stringify({
        events: [
          { tStartMs: 1200, segs: [{ utf8: "All" }, { utf8: " right" }] },
          { tStartMs: 4000 },
          { tStartMs: 5100, segs: [{ utf8: "so here we are" }] },
        ],
      }),
    );
    assert.equal(cues.length, 2);
    assert.equal(cues[0].startSec, 1.2);
    assert.equal(cues[0].text, "All right");
    assert.equal(cues[1].text, "so here we are");
  });

  it("parses timedtext xml", () => {
    const cues = parseXmlCaptions(`
      <transcript>
        <text start="1.20" dur="2.1">All &amp; right</text>
        <text start="5.1">so here we are</text>
      </transcript>
    `);
    assert.equal(cues[0].startSec, 1.2);
    assert.equal(cues[0].text, "All & right");
    assert.equal(cues[1].text, "so here we are");
  });

  it("prefers English manual captions over ASR", () => {
    const track = pickCaptionTrack([
      { language_code: "fr", kind: undefined, base_url: "fr" },
      { language_code: "en", kind: "asr", base_url: "en-asr" },
      { language_code: "en", kind: undefined, base_url: "en" },
    ]);
    assert.equal(track.base_url, "en");
  });

  it("formats cues as a timestamped transcript", () => {
    const text = cuesToTranscript([
      { startSec: 1.2, text: "Hello" },
      { startSec: 65, text: "World" },
    ]);
    assert.match(text, /\[00:00:01\] Hello/);
    assert.match(text, /\[00:01:05\] World/);
  });
});

describe("YouTube time limits", () => {
  it("passes through a result that arrives in time", async () => {
    assert.equal(await withTimeout(Promise.resolve("ok"), 50, "late"), "ok");
  });

  it("rejects a request that never settles", async () => {
    await assert.rejects(withTimeout(new Promise(() => {}), 20, "late"), { message: "late" });
  });

  it("writes a download that keeps sending data", async () => {
    const dest = path.join(tmpDir, "full.mp4");
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5]));
        controller.close();
      },
    });
    await writeDownloadStream(stream, dest, { stallMs: 50 });
    assert.deepEqual([...fs.readFileSync(dest)], [1, 2, 3, 4, 5]);
  });

  it("gives up and cancels a download that stops sending data", async () => {
    const dest = path.join(tmpDir, "stalled.mp4");
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
      },
      cancel() {
        cancelled = true;
      },
    });
    await assert.rejects(writeDownloadStream(stream, dest, { stallMs: 20 }), {
      message: "YouTube download stalled",
    });
    assert.equal(cancelled, true);
  });
});
