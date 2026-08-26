import { listVoiceEdits } from "../db/client.js";
import { scoreVoiceMemory } from "./voice-score.js";

export async function loadVoiceMemory(options = {}) {
  const edits = await listVoiceEdits(options.limit ?? 40, options.beforeSec ?? null);
  const notes = [];
  const rejectedReasons = [];
  const preferredHooks = [];
  const platformNotes = {};

  for (const edit of edits) {
    const bucket = (platformNotes[edit.platform] ??= []);
    if (edit.action === "reject") {
      rejectedReasons.push(edit.note || edit.originalCaption.slice(0, 80));
      bucket.push(
        edit.note
          ? `Rejected: ${edit.note}`
          : "Rejected this clip. Avoid similar intros/moments.",
      );
    } else if (edit.action === "edit") {
      notes.push(
        `On ${edit.platform}, caption was rewritten to: ${edit.editedCaption ?? ""}`,
      );
      bucket.push(`Prefer copy like: ${edit.editedCaption ?? ""}`);
      if (edit.editedHook) preferredHooks.push(edit.editedHook);
    } else {
      notes.push(`Approved ${edit.platform} clip.`);
      if (edit.note) bucket.push(`Approved because: ${edit.note}`);
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
    .map(([platform, lines]) => `- ${platform}: ${lines.join(" | ")}`)
    .join("\n");

  return [
    "Learned creator preferences from previous review/approve/reject cycles:",
    memory.notes.map((note) => `- ${note}`).join("\n"),
    memory.rejectedReasons.length
      ? `Rejected patterns: ${memory.rejectedReasons.join(" ; ")}`
      : "",
    platformLines ? `Per-platform notes:\n${platformLines}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
