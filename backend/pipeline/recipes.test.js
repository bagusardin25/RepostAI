import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractJsonObject } from "../lib/json.js";
import { FIXTURE_TRANSCRIPT } from "./fixture.js";
import {
  diversifyClipWindows,
  fallbackClipRecipes,
  parseClipRecipes,
  parseMindClipRecipes,
  parseTranscriptCues,
} from "./recipes.js";

describe("transcript cues", () => {
  it("parses fixture timestamps", () => {
    const cues = parseTranscriptCues(FIXTURE_TRANSCRIPT);
    assert.equal(cues[0]?.startSec, 0);
    assert.equal(cues.some((cue) => cue.text.includes("four hours")), true);
  });
});

describe("clip recipes", () => {
  it("extracts JSON from a fenced Mind reply", () => {
    const payload = extractJsonObject(`
Sure — here are the packages:
\`\`\`json
{"clips":[{"platform":"tiktok","startSec":8,"endSec":26,"caption":"Stop copying.","hashtags":["#fyp"]}]}
\`\`\`
`);
    const recipes = parseClipRecipes(payload, 96);
    assert.equal(recipes.length, 1);
    assert.equal(recipes[0]?.platform, "tiktok");
    assert.equal(recipes[0].endSec > recipes[0].startSec, true);
  });

  it("parses a messy Mind reply", () => {
    const recipes = parseMindClipRecipes(
      'Here you go\n{"clips":[{"platform":"x","startSec":70,"endSec":88,"hook":"Skip the intro","caption":"Learn this.","reason":"CTA"}]}',
      96,
    );
    assert.equal(recipes[0]?.platform, "x");
    assert.equal(recipes[0]?.hook, "Skip the intro");
  });

  it("builds one fallback clip per platform from the fixture transcript", () => {
    const recipes = fallbackClipRecipes(FIXTURE_TRANSCRIPT, 96);
    assert.deepEqual(
      recipes.map((recipe) => recipe.platform).sort(),
      ["instagram", "tiktok", "x"],
    );
    assert.equal(
      recipes.every((recipe) => recipe.endSec - recipe.startSec >= 8),
      true,
    );
  });

  it("spreads cloned time windows across platforms", () => {
    const recipes = diversifyClipWindows(
      [
        { platform: "tiktok", startSec: 0, endSec: 32, caption: "a", hashtags: [], reason: "", hook: "", aspectRatio: "9:16" },
        { platform: "instagram", startSec: 0, endSec: 32, caption: "b", hashtags: [], reason: "", hook: "", aspectRatio: "9:16" },
        { platform: "x", startSec: 0, endSec: 32, caption: "c", hashtags: [], reason: "", hook: "", aspectRatio: "9:16" },
      ],
      32,
    );
    const keys = recipes.map((recipe) => `${recipe.startSec}:${recipe.endSec}`);
    assert.equal(new Set(keys).size, 3);
  });
});
