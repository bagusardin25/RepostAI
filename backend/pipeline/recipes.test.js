import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractJsonObject } from "../lib/json.js";
import { FIXTURE_TRANSCRIPT } from "./fixture.js";
import {
  diversifyClipWindows,
  fallbackClipRecipes,
  groundPlatformCopy,
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

// Auto-caption cues from "How To Interview Someone on a Podcast".
const PODCAST = `
[00:02:09] far too many podcast hosts out there
[00:02:11] making it all about them I want to
[00:02:13] preface this
[00:02:14] episode by making it explicitly clear
[00:02:18] that your job as a podcast host is to
[00:02:22] ask questions ask a few more questions
[00:02:25] and then button it up that's right lock
[00:02:28] it up
[00:04:37] you should be talking excuse me 80% of
[00:04:41] the time your guest should be talking
[00:04:44] 20% of the time you should be talking
[00:04:46] one more time 80% of the time your guest
[00:04:48] should be talking 20% of the time you
[00:04:51] should be talking does that make sense
[00:10:30] know my mom used to S me when I was a
[00:10:31] kid if you think you're talking too
[00:10:34] much you are that's a great rule of
[00:10:36] thumb to have as a podcaster
`.trim();

function mindClip(fields) {
  return { aspectRatio: "9:16", reason: "", hook: "", caption: "", hashtags: [], ...fields };
}

describe("platform copy", () => {
  it("keeps Mind copy that was spoken in the clip", () => {
    const [clip] = groundPlatformCopy(
      [
        mindClip({
          platform: "tiktok",
          startSec: 129,
          endSec: 150,
          hook: "Far too many podcast hosts make it all about them.",
          caption: "Your job: ask questions. Ask a few more.",
          reason: "Opens on the host-job rule.",
          hashtags: ["#podcasting", "#interviewtips", "#podcasthost"],
        }),
      ],
      PODCAST,
    );
    assert.equal(clip.hook, "Far too many podcast hosts make it all about them.");
    assert.equal(clip.caption, "Your job: ask questions. Ask a few more.");
    assert.deepEqual(clip.hashtags, ["#podcasting", "#interviewtips", "#podcasthost"]);
    assert.equal(clip.reason, "2:09–2:30 · Opens on the host-job rule.");
  });

  it("replaces copy that was not said in the clip", () => {
    const [clip] = groundPlatformCopy(
      [
        mindClip({
          platform: "tiktok",
          startSec: 0,
          endSec: 22,
          hook: "Why do we feel lonely when alone?",
          caption: "Your brain at 2am is a scientist you didn't hire.",
          reason: "Hook-first question that stops the scroll.",
          hashtags: ["#psychology"],
        }),
      ],
      FIXTURE_TRANSCRIPT,
    );
    assert.match(clip.hook, /four hours/);
    assert.doesNotMatch(clip.caption, /brain/);
    assert.equal(clip.hashtags[0], "#psychology");
    assert.equal(clip.hashtags.length, 3);
    assert.equal(clip.reason, "0:00–0:22 · Spoken beat short enough to open a TikTok.");
  });

  it("drops generic hashtags and keeps tags out of the caption", () => {
    const [clip] = groundPlatformCopy(
      [
        mindClip({
          platform: "instagram",
          startSec: 277,
          endSec: 295,
          hook: "80% of the time, your guest should be talking.",
          caption: "The 80/20 rule: your guest talks 80%. #podcast #fyp\n\nFull breakdown on the original video.",
          hashtags: ["#fyp", "#RepostAI", "podcast tips", "#creators", "#interviewing"],
        }),
      ],
      PODCAST,
    );
    assert.equal(clip.caption, "The 80/20 rule: your guest talks 80%.");
    assert.equal(clip.hashtags.some((tag) => /^#(fyp|repostai|creators)$/i.test(tag)), false);
    assert.deepEqual(clip.hashtags, ["#podcasttips", "#interviewing", "#talking", "#guest"]);
  });

  it("replaces a second-zero reason on a later clip and fixes its clock range", () => {
    const [clip] = groundPlatformCopy(
      [
        mindClip({
          platform: "x",
          startSec: 631,
          endSec: 644,
          hook: "If you think you're talking too much, you are.",
          caption: "If you think you're talking too much as the host, you are.",
          reason: "0:00–0:13. Sharp closing takeaway at second zero.",
          hashtags: ["#podcasting", "#interviewskills", "#hosting"],
        }),
      ],
      PODCAST,
    );
    assert.equal(clip.hook, "If you think you're talking too much, you are.");
    assert.equal(clip.reason, "10:31–10:44 · Single spoken takeaway sized for an X video.");
    assert.deepEqual(clip.hashtags, ["#podcasting", "#interviewskills"]);
  });

  it("builds fallback copy from whole spoken lines without fake full stops", () => {
    const recipes = fallbackClipRecipes(
      [
        "[00:00:04] after three interviews I finally got the job offer from a startup in Berlin.",
        "[00:00:09] Moving there changed how I think about risk completely.",
        "[00:00:22] the single biggest mistake I see founders make when they raise their first round is optimizing for valuation instead of picking the partner who will actually help them",
        "[00:00:43] Keep the partner who answers your calls at midnight.",
      ].join("\n"),
      60,
    );
    const [tiktok, instagram, x] = recipes;
    assert.equal(tiktok.hook, "After three interviews I finally got the job offer from a startup in Berlin.");
    assert.equal(
      tiktok.reason,
      "0:04–0:22 · Fallback pick (AI analysis unavailable): opening section of the video.",
    );
    assert.equal(instagram.hook.endsWith("…"), true);
    assert.equal(instagram.hook.length <= 90, true);
    assert.equal(x.caption, "Keep the partner who answers your calls at midnight.");
    for (const recipe of recipes) {
      assert.equal(recipe.hashtags.some((tag) => tag === "#fyp" || tag === "#repostai"), false);
    }
  });

  it("tags Indonesian speech with words that were said, not filler", () => {
    const transcript =
      "[00:00:04] jadi menurut saya yang paling penting itu adalah konsistensi dalam membuat konten karena kalau kita tidak konsisten maka algoritma tidak akan mengenali kita";
    const [tiktok] = fallbackClipRecipes(transcript, 60);
    assert.equal(tiktok.hashtags.length > 0, true);
    for (const tag of tiktok.hashtags) {
      assert.match(transcript, new RegExp(`\\b${tag.slice(1)}\\b`));
      assert.equal(["#yang", "#adalah", "#dalam", "#karena", "#kalau", "#tidak"].includes(tag), false);
    }
  });

  it("keeps Mind copy in scripts written without spaces", () => {
    const [clip] = groundPlatformCopy(
      [
        mindClip({
          platform: "tiktok",
          startSec: 0,
          endSec: 20,
          hook: "ゲストに話してもらおう",
          caption: "ゲストが主役です",
          hashtags: ["#ポッドキャスト"],
        }),
      ],
      "[00:00:00] 今日はポッドキャストの話をします\n[00:00:05] ゲストに話してもらうことが一番大事です",
    );
    assert.equal(clip.hook, "ゲストに話してもらおう");
    assert.equal(clip.caption, "ゲストが主役です");
    assert.deepEqual(clip.hashtags, ["#ポッドキャスト"]);
  });

  it("falls back to the video title when a window has no speech", () => {
    const [tiktok] = fallbackClipRecipes(
      "[00:00:50] only late speech here",
      60,
      "How To Interview Someone on a Podcast #podcasting",
    );
    assert.equal(tiktok.caption, "How To Interview Someone on a Podcast");
    assert.equal(tiktok.hook, "How To Interview Someone on a Podcast");
    assert.equal(tiktok.hashtags.includes("#podcast"), true);
  });
});
