import { listVoiceEdits } from "../db/client.js";
import { scoreVoiceMemory } from "./voice-score.js";
import { extractYoutubeId } from "./youtube.js";

/** Production packs learn only from production reviews; sandbox packs may also use test reviews. */
export async function loadVoiceMemory(options = {}) {
  const edits = await listVoiceEdits(options.limit ?? 40, options.beforeSec ?? null, {
    includeSandbox: Boolean(options.includeSandbox),
  });
  return buildVoiceMemory(edits, options.sourceKey ?? null);
}

/**
 * Reviews from other videos teach style only: their hooks and captions are described, never
 * quoted, because the Mind copied quoted lines word for word into unrelated videos. Edited
 * copy is quoted only for the same source video (`sourceKey`).
 */
export function buildVoiceMemory(edits, sourceKey = null) {
  const notes = [];
  const rejectedReasons = [];
  const preferredHooks = [];
  const platformNotes = {};
  const addPlatformNote = (platform, line) => (platformNotes[platform] ??= []).push(line);

  for (const edit of edits) {
    if (edit.action === "reject") {
      rejectedReasons.push(edit.note || edit.originalCaption.slice(0, 80));
      addPlatformNote(
        edit.platform,
        edit.note
          ? `Rejected: ${edit.note}`
          : "Rejected this clip. Avoid similar intros/moments.",
      );
    } else if (edit.action === "edit") {
      notes.push(`On ${edit.platform}, the creator ${describeRewrite(edit)}.`);
      if (edit.note) addPlatformNote(edit.platform, `Edit note: ${edit.note}`);
      if (sourceKey && voiceSourceKey(edit) === sourceKey && edit.editedCaption) {
        addPlatformNote(edit.platform, `Prefer copy like (same video): ${edit.editedCaption}`);
      }
      if (edit.editedHook) preferredHooks.push(edit.editedHook);
    } else {
      notes.push(`Approved ${edit.platform} clip: ${describeCopy(edit)}.`);
      if (edit.note) addPlatformNote(edit.platform, `Approved because: ${edit.note}`);
      if (edit.originalHook) preferredHooks.push(edit.originalHook);
    }
  }

  return {
    notes: unique(notes).slice(0, 12),
    rejectedReasons: unique(rejectedReasons).slice(0, 8),
    preferredHooks: unique(preferredHooks).slice(0, 8),
    platformNotes: Object.fromEntries(
      Object.entries(platformNotes).map(([platform, values]) => [
        platform,
        unique(values).slice(0, 6),
      ]),
    ),
    score: scoreVoiceMemory(edits),
  };
}

/** Same key for a job and for the voice edits made on it, so reruns of one video match. */
export function voiceSourceKey(item) {
  if (!item) return null;
  if (item.sourceType === "fixture") return "fixture";
  const videoId = item.sourceUrl ? extractYoutubeId(item.sourceUrl) : null;
  if (videoId) return `youtube:${videoId}`;
  const jobId = item.jobId ?? item.id;
  return jobId ? `job:${jobId}` : null;
}

/** What a review says about style, without the reviewed words. */
export function describeReviewStyle(edit) {
  return edit.action === "edit" ? describeRewrite(edit) : describeCopy(edit);
}

function describeRewrite(edit) {
  const changes = [
    rewriteChange("hook", edit.originalHook, edit.editedHook),
    rewriteChange("caption", edit.originalCaption, edit.editedCaption),
  ].filter(Boolean);
  return changes.length ? changes.join(" and ") : "rewrote the copy";
}

function rewriteChange(label, before, after) {
  const next = String(after ?? "").trim();
  if (!next || next === String(before ?? "").trim()) return null;
  const from = wordCount(before);
  const to = wordCount(next);
  const question = isQuestion(next) ? ", as a question" : "";
  if (from > to) return `cut the ${label} from ${from} to ${to} words${question}`;
  if (from && from < to) return `grew the ${label} from ${from} to ${to} words${question}`;
  return `rewrote the ${label} (${to} words${question})`;
}

function describeCopy(edit) {
  const parts = [copyLength("hook", edit.originalHook), copyLength("caption", edit.originalCaption)];
  return parts.filter(Boolean).join(", ") || "no copy";
}

function copyLength(label, text) {
  const words = wordCount(text);
  if (!words) return null;
  return `${words}-word ${label}${isQuestion(text) ? " (a question)" : ""}`;
}

function wordCount(text) {
  return String(text ?? "").split(/\s+/).filter(Boolean).length;
}

function isQuestion(text) {
  return String(text ?? "").trim().endsWith("?");
}

function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function voiceMemoryPrompt(memory) {
  if (
    memory.notes.length === 0 &&
    memory.rejectedReasons.length === 0 &&
    Object.keys(memory.platformNotes).length === 0
  ) {
    return "No prior creator edits yet. Default to hook-first clips and never invent facts.";
  }

  const platformLines = Object.entries(memory.platformNotes)
    .filter(([, lines]) => lines.length > 0)
    .map(([platform, lines]) => `- ${platform}: ${lines.join(" | ")}`)
    .join("\n");

  return [
    "Learned creator style from previous review/approve/reject cycles, mostly on other videos. Follow their tone, length, and structure. Never reuse wording from another video; only lines marked (same video) may be reused.",
    memory.notes.map((note) => `- ${note}`).join("\n"),
    memory.rejectedReasons.length
      ? `Rejected patterns: ${memory.rejectedReasons.join(" ; ")}`
      : "",
    platformLines ? `Per-platform notes:\n${platformLines}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
