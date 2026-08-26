import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractJsonObject } from "../lib/json.js";
import { mindPlainText } from "../lib/mind-text.js";

describe("mindPlainText", () => {
  it("unwraps HTML Mind replies", () => {
    assert.equal(mindPlainText("<p>pong</p>"), "pong");
  });

  it("keeps JSON payloads that the Mind wraps in tags", () => {
    const raw = mindPlainText('<p>{"clips":[{"platform":"x"}]}</p>');
    assert.deepEqual(extractJsonObject(raw), { clips: [{ platform: "x" }] });
  });
});
