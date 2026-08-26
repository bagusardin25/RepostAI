import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareJobPackages,
  comparePlatformClips,
  snapshotVoice,
  voiceHasHistory,
} from "./lineage.js";

describe("voice lineage", () => {
  it("treats empty memory as no history", () => {
    assert.equal(voiceHasHistory(snapshotVoice(null)), false);
    assert.equal(voiceHasHistory(snapshotVoice({ notes: [], rejectedReasons: [], platformNotes: {} })), false);
  });

  it("flags standing reject notes as history", () => {
    const snap = snapshotVoice({
      notes: [],
      rejectedReasons: ["I hate cold intros"],
      preferredHooks: [],
      platformNotes: { tiktok: ["Rejected: I hate cold intros"] },
      score: { score: 7.2, sampleSize: 3 },
    });
    assert.equal(voiceHasHistory(snap), true);
    assert.equal(snap.score, 7.2);
  });

  it("compares hooks against the previous job on the same platform", () => {
    const rows = comparePlatformClips(
      [{ platform: "tiktok", hook: "Wait for it…", editedHook: null, status: "rejected", reviewNote: "cold intro" }],
      [{ platform: "tiktok", hook: "Stop copying the same clip." }],
    );
    assert.equal(rows[0].changed, true);
    assert.equal(rows[0].previousStatus, "rejected");
    assert.equal(rows[0].previousNote, "cold intro");
  });

  it("builds a side-by-side package diff", () => {
    const rows = compareJobPackages(
      [
        {
          platform: "tiktok",
          hook: "Wait for it",
          caption: "long intro",
          status: "rejected",
          reviewNote: "cold intro",
          startSec: 0,
          endSec: 20,
        },
      ],
      [
        {
          platform: "tiktok",
          hook: "Stop copying",
          caption: "punch first",
          status: "needs_review",
          startSec: 8,
          endSec: 26,
        },
      ],
    );
    assert.equal(rows[0].hookChanged, true);
    assert.equal(rows[0].windowChanged, true);
    assert.equal(rows[0].taughtBy, "rejected");
  });
});
