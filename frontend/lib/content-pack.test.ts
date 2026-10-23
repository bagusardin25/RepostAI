import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ClipPackage } from "./api";
import { clipDownloadUrl, copyPackMessage, formatClipPost } from "./content-pack";

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

describe("formatClipPost", () => {
  const post = {
    platform: "tiktok",
    startSec: 8,
    endSec: 22,
    durationSec: 14,
    displayHook: "Hook",
    displayCaption: "Caption",
    hashtags: ["clips"],
  };

  it("adds the lines spoken in the clip, timed from its start", () => {
    const text = formatClipPost(post, "[00:00:08] First line.\n[00:00:16] Second line.\n[00:00:30] Later.");
    assert.ok(text.endsWith("TRANSCRIPT:\n00:00 First line.\n00:08 Second line."));
  });

  it("leaves the transcript out when none is known", () => {
    assert.equal(formatClipPost(post).includes("TRANSCRIPT"), false);
  });
});
