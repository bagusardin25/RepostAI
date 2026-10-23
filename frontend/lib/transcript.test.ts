import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clipTranscript, formatSrt, timedTranscript, transcriptText } from "./transcript";

const transcript = `
[00:00:00] Hey, I used to spend four hours chopping clips.
[00:00:08] Caption for TikTok, then a different hook for Reels.
[00:00:16] None of those platforms want the same first three seconds.
[0:22] TikTok needs a punch in the face.
[1:30] Last line.
`;

describe("clipTranscript", () => {
  it("keeps the lines spoken inside the window, timed from the clip start", () => {
    assert.deepEqual(clipTranscript(transcript, 8, 22), [
      { startSec: 0, endSec: 8, text: "Caption for TikTok, then a different hook for Reels." },
      { startSec: 8, endSec: 14, text: "None of those platforms want the same first three seconds." },
    ]);
  });

  it("keeps a line that started just before the clip, from 0:00", () => {
    assert.deepEqual(clipTranscript(transcript, 10, 16), [
      { startSec: 0, endSec: 6, text: "Caption for TikTok, then a different hook for Reels." },
    ]);
  });

  it("drops a line that started long before the clip", () => {
    assert.deepEqual(clipTranscript(transcript, 40, 60), []);
  });

  it("ends the last line at the clip end and reads [m:ss] lines", () => {
    assert.deepEqual(clipTranscript(transcript, 85, 95), [{ startSec: 5, endSec: 10, text: "Last line." }]);
  });

  it("returns nothing for an empty transcript", () => {
    assert.deepEqual(clipTranscript("", 0, 30), []);
  });
});

describe("transcript formats", () => {
  const lines = clipTranscript(transcript, 8, 22);

  it("writes a valid SubRip file", () => {
    assert.equal(
      formatSrt(lines),
      [
        "1",
        "00:00:00,000 --> 00:00:08,000",
        "Caption for TikTok, then a different hook for Reels.",
        "",
        "2",
        "00:00:08,000 --> 00:00:14,000",
        "None of those platforms want the same first three seconds.",
        "",
      ].join("\n"),
    );
  });

  it("writes plain and timed text", () => {
    assert.equal(
      transcriptText(lines),
      "Caption for TikTok, then a different hook for Reels.\nNone of those platforms want the same first three seconds.",
    );
    assert.equal(timedTranscript(lines).split("\n")[1], "00:08 None of those platforms want the same first three seconds.");
  });
});
