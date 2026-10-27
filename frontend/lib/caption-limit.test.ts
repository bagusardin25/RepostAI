import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { captionLimit, reviewBlockedBy } from "./caption-limit";

describe("captionLimit", () => {
  it("uses each platform's limit and 2200 for anything else", () => {
    assert.equal(captionLimit("x"), 280);
    assert.equal(captionLimit("tiktok"), 2200);
    assert.equal(captionLimit("instagram"), 2200);
    assert.equal(captionLimit("youtube"), 2200);
  });
});

describe("reviewBlockedBy", () => {
  it("stops Approve and Save on an X caption over 280 characters", () => {
    const caption = "a".repeat(300);
    assert.equal(reviewBlockedBy("approve", "x", caption), "Caption is 20 characters over limit.");
    assert.equal(reviewBlockedBy("edit", "x", caption), "Caption is 20 characters over limit.");
  });

  it("lets a caption at the limit through", () => {
    assert.equal(reviewBlockedBy("approve", "x", "a".repeat(280)), null);
    assert.equal(reviewBlockedBy("approve", "tiktok", "a".repeat(2200)), null);
  });

  it("stops a TikTok caption one character over", () => {
    assert.equal(reviewBlockedBy("approve", "tiktok", "a".repeat(2201)), "Caption is 1 characters over limit.");
  });

  it("never stops Reject", () => {
    assert.equal(reviewBlockedBy("reject", "x", "a".repeat(300)), null);
  });
});
