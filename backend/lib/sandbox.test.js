import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPreviewRequest } from "./sandbox.js";

function request(headers) {
  return new Request("http://localhost/api/jobs", { headers });
}

describe("isPreviewRequest", () => {
  it("treats a pull request branch preview as test traffic", () => {
    assert.equal(
      isPreviewRequest(request({ origin: "https://repostai-git-ts-pack-export-bagusardinp-3679s-projects.vercel.app" })),
      true,
    );
  });

  it("falls back to the Referer origin when Origin is missing", () => {
    assert.equal(
      isPreviewRequest(
        request({ referer: "https://repostai-git-feat-adaptive-desk-ui-bagusardinp-3679s-projects.vercel.app/desk" }),
      ),
      true,
    );
  });

  it("keeps production, the main branch alias, and local runs as real traffic", () => {
    for (const origin of [
      "https://repostai-nine.vercel.app",
      "https://repostai-git-main-bagusardinp-3679s-projects.vercel.app",
      "https://repostai-bagusardinp-3679s-projects.vercel.app",
      "http://localhost:3000",
      "https://repostai-git-ts-x.vercel.app.evil.com",
    ]) {
      assert.equal(isPreviewRequest(request({ origin })), false, origin);
    }
    assert.equal(isPreviewRequest(request({})), false);
  });
});
