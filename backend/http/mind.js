import { json } from "../lib/http.js";
import {
  conversationAlias,
  equipBazaarSkill,
  getMindDesk,
  getMindHistory,
  mindsConfigured,
  sendMindMessage,
} from "../pipeline/minds.js";

export async function GET(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (path.endsWith("/history")) {
    if (!mindsConfigured()) return json({ alias: conversationAlias(), messages: [] });
    const limit = Number(url.searchParams.get("limit") || 40);
    const messages = await getMindHistory(Number.isFinite(limit) ? limit : 40);
    return json({ alias: conversationAlias(), messages });
  }

  return json(await getMindDesk());
}

export async function POST(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (path.endsWith("/skills")) {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    try {
      const result = await equipBazaarSkill(body.skillId);
      return json({ ok: true, result });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Could not equip skill" }, 400);
    }
  }

  if (path.endsWith("/messages")) {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    try {
      const result = await sendMindMessage(body.text ?? body.messageText);
      return json(result, 202);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Could not send message" }, 400);
    }
  }

  return json({ error: "Not found" }, 404);
}
