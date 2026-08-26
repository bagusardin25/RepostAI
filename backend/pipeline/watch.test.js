import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractChannelId, parseChannelFeed } from "./watch.js";

describe("channel watch", () => {
  it("extracts a channel id from common YouTube URLs", () => {
    assert.equal(
      extractChannelId("https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw"),
      "UC_x5XG1OV2P6uZZ5FSM9Ttw",
    );
    assert.equal(extractChannelId("UC_x5XG1OV2P6uZZ5FSM9Ttw"), "UC_x5XG1OV2P6uZZ5FSM9Ttw");
    assert.equal(extractChannelId("https://www.youtube.com/@someone"), null);
  });

  it("parses the public YouTube atom feed", () => {
    const xml = `<?xml version="1.0"?>
<feed>
  <entry>
    <yt:videoId>dQw4w9wgxcQ</yt:videoId>
    <title>Never Gonna Give You Up</title>
    <published>2026-01-01T00:00:00+00:00</published>
    <link href="https://www.youtube.com/watch?v=dQw4w9wgxcQ"/>
  </entry>
</feed>`;
    const entries = parseChannelFeed(xml);
    assert.equal(entries[0]?.videoId, "dQw4w9wgxcQ");
    assert.equal(entries[0]?.title, "Never Gonna Give You Up");
    assert.equal(entries[0]?.url, "https://www.youtube.com/watch?v=dQw4w9wgxcQ");
  });
});
