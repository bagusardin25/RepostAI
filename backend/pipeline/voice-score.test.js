import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreVoiceMemory } from "./voice-score.js";

describe("voice score", () => {
  it("returns an empty baseline when there are no edits", () => {
    const score = scoreVoiceMemory([]);
    assert.equal(score.score, null);
    assert.equal(score.trend, "flat");
    assert.equal(score.sampleSize, 0);
  });

  it("scores mostly-approved reviews higher than mostly-rejected ones", () => {
    const approved = scoreVoiceMemory([
      { action: "approve" },
      { action: "approve" },
      { action: "edit" },
      { action: "approve" },
    ]);
    const rejected = scoreVoiceMemory([
      { action: "reject" },
      { action: "reject" },
      { action: "reject" },
      { action: "edit" },
    ]);
    assert.equal(approved.score > rejected.score, true);
    assert.equal(approved.score >= 7, true);
  });
});
