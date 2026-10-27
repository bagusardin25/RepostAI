import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { captionLimit, captionOverLimit } from "./caption-limit.js";

describe("captionLimit", () => {
  it("uses each platform's limit and 2200 for anything else", () => {
    assert.equal(captionLimit("x"), 280);
    assert.equal(captionLimit("tiktok"), 2200);
    assert.equal(captionLimit("instagram"), 2200);
    assert.equal(captionLimit("constructor"), 2200);
  });
});

describe("captionOverLimit", () => {
  it("counts the characters over an X caption's 280", () => {
    assert.equal(captionOverLimit("x", "a".repeat(300)), 20);
  });

  it("is 0 for a caption that fits, or no caption", () => {
    assert.equal(captionOverLimit("x", "a".repeat(280)), 0);
    assert.equal(captionOverLimit("tiktok", "a".repeat(2200)), 0);
    assert.equal(captionOverLimit("x", null), 0);
  });
});
