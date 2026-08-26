import { getClip, insertVoiceEdit, updateClipReview } from "../db/client.js";
import { publicClip } from "./serialize.js";
import { json } from "../lib/http.js";
import { REVIEW_ACTIONS } from "../lib/constants.js";
import { randomUUID } from "node:crypto";

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

  await updateClipReview(params.id, {
    status,
    editedCaption: editedCaption ?? null,
    editedHook: editedHook ?? null,
    reviewNote: body.note?.trim() || null,
  });

  await insertVoiceEdit({
    id: randomUUID(),
    clipId: clip.id,
    jobId: clip.jobId,
    platform: clip.platform,
    action,
    originalCaption: clip.caption,
    editedCaption: action === "edit" ? editedCaption : null,
    note: body.note?.trim() || null,
  });

  const updated = await getClip(params.id);
  return json({ clip: updated ? publicClip(updated) : null });
}
