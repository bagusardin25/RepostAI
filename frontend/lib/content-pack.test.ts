import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ClipPackage } from "./api";
import { clipDownloadUrl, copyPackMessage } from "./content-pack";

const clip = { id: "3229d75e-37d2", platform: "tiktok", videoUrl: "/api/media/clips/3229d75e.mp4" } as const;

describe("clipDownloadUrl", () => {
  it("asks the API for an attachment named after the platform", () => {
    assert.equal(clipDownloadUrl(clip), "/api/media/clips/3229d75e.mp4?download=tiktok-3229d7.mp4");
  });

  it("keeps an existing query string", () => {
    assert.equal(
      clipDownloadUrl({ ...clip, videoUrl: "/api/media/clips/a.mp4?v=2" }),
      "/api/media/clips/a.mp4?v=2&download=tiktok-3229d7.mp4",
    );
  });

  it("returns null when the clip has no file", () => {
    assert.equal(clipDownloadUrl({ ...clip, videoUrl: null }), null);
  });
});

describe("copyPackMessage", () => {
  const ready = (count: number) => Array.from({ length: count }, () => ({}) as ClipPackage);

  it("says clips in review were left out and why", () => {
    assert.equal(
      copyPackMessage({ ready: [], waitingCount: 3, draftsIncluded: true }),
      "Copied 4 drafts. 3 clips still need review and are left out until you approve them.",
    );
  });

  it("uses the singular for one clip in review", () => {
    assert.equal(
      copyPackMessage({ ready: ready(2), waitingCount: 1, draftsIncluded: true }),
      "Copied 2 clips + 4 drafts. 1 clip still needs review and is left out until you approve it.",
    );
  });

  it("adds nothing when every clip is decided", () => {
    assert.equal(copyPackMessage({ ready: ready(1), waitingCount: 0, draftsIncluded: true }), "Copied 1 clip + 4 drafts.");
  });
});
