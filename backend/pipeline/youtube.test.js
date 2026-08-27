import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cuesToTranscript,
  extractYoutubeId,
  parseJson3Captions,
  parseXmlCaptions,
  pickCaptionTrack,
} from "./youtube.js";

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
