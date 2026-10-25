import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COVERED_AREAS, hookTop } from "./safe-zones";

describe("COVERED_AREAS", () => {
  it("covers every platform with areas inside the frame", () => {
    for (const platform of ["tiktok", "instagram", "x"] as const) {
      assert.ok(COVERED_AREAS[platform].length > 0, platform);
      for (const area of COVERED_AREAS[platform]) {
        assert.ok(area.x >= 0 && area.y >= 0 && area.w > 0 && area.h > 0, `${platform} ${area.label}`);
        assert.ok(area.x + area.w <= 1 && area.y + area.h <= 1, `${platform} ${area.label}`);
      }
    }
  });

  it("starts the hook just below each platform's top bar", () => {
    assert.ok(Math.abs(hookTop("tiktok") - 0.11) < 1e-9);
    assert.ok(Math.abs(hookTop("instagram") - 0.15) < 1e-9);
    assert.ok(Math.abs(hookTop("x") - 0.09) < 1e-9);
  });
});
