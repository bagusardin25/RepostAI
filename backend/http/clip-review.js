import { randomUUID } from "node:crypto";
import { getClip, getJob, insertVoiceEdit, listClipsForJob, updateClipReview } from "../db/client.js";
import { defer, json } from "../lib/http.js";
import { REVIEW_ACTIONS } from "../lib/constants.js";
import { rememberCreatorDecision, rememberReviewSession } from "../pipeline/minds.js";
import { publicClip } from "./serialize.js";

export async function POST(request, params) {
  const clip = await getClip(params.id);
  if (!clip) return json({ error: "Clip not found" }, 404);

  const body = await request.json();
  const action = body.action;
  if (!action || !REVIEW_ACTIONS.includes(action)) {
    return json({ error: "action must be approve, reject, or edit" }, 400);
  }

  if (action === "edit" && !body.caption && !body.hook) {
    return json({ error: "edit requires caption and/or hook" }, 400);
  }

  const editedCaption = action === "edit" ? body.caption?.trim() || clip.caption : clip.editedCaption;
  const editedHook = action === "edit" ? body.hook?.trim() || clip.hook : clip.editedHook;
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "edited";
  const note = body.note?.trim() || null;

  await updateClipReview(params.id, {
    status,
    editedCaption: editedCaption ?? null,
    editedHook: editedHook ?? null,
    reviewNote: note,
  });

  await insertVoiceEdit({
    id: randomUUID(),
    clipId: clip.id,
    jobId: clip.jobId,
    platform: clip.platform,
    action,
    originalCaption: clip.caption,
    editedCaption: action === "edit" ? editedCaption : null,
    originalHook: clip.hook,
    editedHook: action === "edit" ? editedHook : null,
    note,
  });

  defer(async () => {
    await rememberCreatorDecision({
      platform: clip.platform,
      action,
      originalCaption: clip.caption,
      originalHook: clip.hook,
      editedCaption: action === "edit" ? editedCaption : null,
      editedHook: action === "edit" ? editedHook : null,
      note,
    });

    const clips = await listClipsForJob(clip.jobId);
    if (clips.some((item) => item.status === "needs_review")) return;
    const job = await getJob(clip.jobId);
    await rememberReviewSession({
      title: job?.sourceTitle ?? "source video",
      clips,
    });
  });

  const updated = await getClip(params.id);
  return json({ clip: updated ? publicClip(updated) : null });
}
