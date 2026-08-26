import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURE_TRANSCRIPT } from "./fixture.js";
import { fallbackArtifacts, parseMindArtifacts } from "./artifacts.js";

describe("artifacts", () => {
  it("builds fallback packages from a timestamped transcript", () => {
    const artifacts = fallbackArtifacts(FIXTURE_TRANSCRIPT);
    assert.equal(artifacts.tiktokScript.lines.length > 0, true);
    assert.equal(artifacts.instagramCarousel.slides.length >= 4, true);
    assert.equal(artifacts.xThread.tweets.every((tweet) => tweet.length <= 280), true);
    assert.equal(artifacts.linkedinPost.text.includes("YouTube"), true);
  });

  it("parses Mind artifacts and fills missing pieces from fallback", () => {
    const artifacts = parseMindArtifacts(
      `{"clips":[],"artifacts":{"xThread":{"tweets":["Hook first. Never copy-paste."]},"linkedinPost":{"text":""}}}`,
      FIXTURE_TRANSCRIPT,
    );
    assert.equal(artifacts.xThread.tweets[0], "Hook first. Never copy-paste.");
    assert.equal(artifacts.instagramCarousel.slides.length > 0, true);
    assert.equal(artifacts.linkedinPost.text.length > 20, true);
  });
});
