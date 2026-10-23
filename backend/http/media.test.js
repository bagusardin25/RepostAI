import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "repostai-media-"));
process.env.DATA_DIR = dataDir;
fs.mkdirSync(path.join(dataDir, "clips"), { recursive: true });
fs.writeFileSync(path.join(dataDir, "clips", "abc.mp4"), Buffer.alloc(32, 1));

const { GET } = await import("./media.js");

after(() => {
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    // Windows can hold a just-closed file briefly; a leftover temp dir is harmless.
  }
});

async function fetchClip(query = "", headers = {}) {
  const request = new Request(`http://localhost/api/media/clips/abc.mp4${query}`, { headers });
  const response = await GET(request, { kind: "clips", filename: "abc.mp4" });
  await response.body?.cancel();
  return response;
}

describe("GET /api/media", () => {
  it("streams inline when no download is asked for", async () => {
    const response = await fetchClip();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-disposition"), null);
  });

  it("sends an attachment with the requested file name", async () => {
    const response = await fetchClip("?download=tiktok-ab12cd.mp4");
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="tiktok-ab12cd.mp4"');
  });

  it("strips characters that could break the header or the path", async () => {
    const response = await fetchClip(`?download=${encodeURIComponent('../x"y\r\nz.mp4')}`);
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="xyz.mp4"');
  });

  it("falls back to the stored file name for an empty download value", async () => {
    const response = await fetchClip("?download=");
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="abc.mp4"');
  });

  it("keeps the attachment on range requests", async () => {
    const response = await fetchClip("?download=x-clip.mp4", { range: "bytes=0-9" });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="x-clip.mp4"');
  });
});
