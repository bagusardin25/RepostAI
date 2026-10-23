import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildReviewMemoryMessage } from "./minds.js";
import { buildVoiceMemory, voiceMemoryPrompt, voiceSourceKey } from "./voice.js";

const PSYCH_URL = "https://youtu.be/j9vqa4K4h90?si=JRUleWP8LR1Iciyr";
const PSYCH_HOOK = "Why do we feel lonely when alone?";
const PSYCH_X_CAPTION = "Your brain at 2am is a scientist you didn't hire.";
const PSYCH_IG_CAPTION =
  "Your mind doesn't sleep when you do. Here are the questions it asks when no one's watching.";
const SAMPLE_EDIT = "Stop copying the same video. TikTok wants a punch, not your intro.";

// The reviews that were in the database when a sample-video pack reused the psychology
// video's hook and captions word for word (newest first, as listVoiceEdits returns them).
const EDITS = [
  ...["x", "instagram", "tiktok"].map((platform) => ({
    jobId: "a2c17164",
    sourceType: "youtube",
    sourceUrl: PSYCH_URL,
    platform,
    action: "approve",
    originalHook: PSYCH_HOOK,
    originalCaption: { x: PSYCH_X_CAPTION, instagram: PSYCH_IG_CAPTION, tiktok: SAMPLE_EDIT }[platform],
    editedHook: null,
    editedCaption: null,
    note: null,
  })),
  {
    jobId: "7fd3a10e",
    sourceType: "fixture",
    sourceUrl: null,
    platform: "tiktok",
    action: "edit",
    originalHook: null,
    originalCaption:
      "Caption for TikTok, then a different hook for Reels, then a thread for X. None of those platforms want the same first three seconds. TikTok needs a punch in the face. Instagram needs a loop. X needs one sharp takeaway.\n\nFull breakdown on the original video.",
    editedHook: null,
    editedCaption: SAMPLE_EDIT,
    note: "shorter, more aggressive, skip intro",
  },
];

describe("voice memory", () => {
  it("describes reviews of other videos instead of quoting them", () => {
    const prompt = voiceMemoryPrompt(buildVoiceMemory(EDITS, "youtube:UnxkpGe8quw"));

    for (const line of [PSYCH_HOOK, PSYCH_X_CAPTION, PSYCH_IG_CAPTION, SAMPLE_EDIT]) {
      assert.equal(prompt.includes(line), false, `prompt quotes "${line}"`);
    }
    assert.match(prompt, /On tiktok, the creator cut the caption from 46 to 12 words\./);
    assert.match(prompt, /Approved x clip: 7-word hook \(a question\), 10-word caption\./);
    assert.match(prompt, /- tiktok: Edit note: shorter, more aggressive, skip intro/);
  });

  it("quotes edited copy only on a rerun of the same video", () => {
    const prompt = voiceMemoryPrompt(buildVoiceMemory(EDITS, "fixture"));

    assert.match(prompt, /Prefer copy like \(same video\): Stop copying the same video\./);
    assert.equal(prompt.includes(PSYCH_HOOK), false);
    assert.equal(prompt.includes(PSYCH_X_CAPTION), false);
  });

  it("leaves out platforms that have no notes", () => {
    const memory = buildVoiceMemory(EDITS, null);

    assert.deepEqual(Object.keys(memory.platformNotes), ["tiktok"]);
    assert.doesNotMatch(voiceMemoryPrompt(memory), /- (instagram|x): *$/m);
  });

  it("keys a job and its review edits to the same source", () => {
    const job = { id: "1deabcff", sourceType: "youtube", sourceUrl: "https://www.youtube.com/watch?v=j9vqa4K4h90" };

    assert.equal(voiceSourceKey(job), "youtube:j9vqa4K4h90");
    assert.equal(voiceSourceKey(EDITS[0]), voiceSourceKey(job));
    assert.equal(voiceSourceKey({ id: "1deabcff", sourceType: "fixture" }), "fixture");
    assert.equal(voiceSourceKey({ jobId: "u1", sourceType: "upload", sourceUrl: null }), "job:u1");
  });
});

describe("review memory message", () => {
  it("sends the shape of an approved clip, not its words", () => {
    const message = buildReviewMemoryMessage({ ...EDITS[0], title: "Apa Itu Ilmu Psikologi" });

    assert.equal(message.includes(PSYCH_HOOK), false);
    assert.equal(message.includes(PSYCH_X_CAPTION), false);
    assert.match(message, /Video: Apa Itu Ilmu Psikologi/);
    assert.match(message, /Style: 7-word hook \(a question\), 10-word caption/);
    assert.match(message, /not the wording/);
  });

  it("sends how an edit changed the copy and the creator's note", () => {
    const message = buildReviewMemoryMessage({ ...EDITS[3], title: "Stop posting the same YouTube video everywhere" });

    assert.equal(message.includes(SAMPLE_EDIT), false);
    assert.match(message, /Style: cut the caption from 46 to 12 words/);
    assert.match(message, /Creator note: shorter, more aggressive, skip intro/);
  });
});
