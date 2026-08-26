import { createMindsClient } from "@animocabrands/minds-client-lib";
import { PLATFORM_SPECS } from "../lib/constants.js";
import { parseMindClipRecipes } from "./recipes.js";
import { voiceMemoryPrompt } from "./voice.js";

const ALIAS = process.env.MINDS_CONVERSATION_ALIAS || "main";

export function mindsConfigured() {
  return Boolean(process.env.MINDS_BUILDER_API_KEY);
}

function client() {
  const builderApiKey = process.env.MINDS_BUILDER_API_KEY;
  if (!builderApiKey) {
    throw new Error("MINDS_BUILDER_API_KEY is not set");
  }
  return createMindsClient({ builderApiKey });
}

async function ensureAlias() {
  const mindsClient = client();
  const configuredId = process.env.MINDS_MIND_ID;
  const mindId = configuredId || (await mindsClient.listMinds())[0]?.mindId;
  if (!mindId) {
    throw new Error("No Mind found on this Builder account");
  }
  await mindsClient.ensureConversation(ALIAS, mindId);
  return mindsClient;
}

export async function mindsHealth() {
  if (!mindsConfigured()) {
    return { configured: false, ok: false };
  }
  try {
    const mindsClient = client();
    const list = await mindsClient.listMinds();
    return {
      configured: true,
      ok: true,
      mindCount: list.length,
      mindId: process.env.MINDS_MIND_ID || list[0]?.mindId || null,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : "Minds request failed",
    };
  }
}

export async function proposeClipsWithMinds(input) {
  const mindsClient = await ensureAlias();
  const before = await mindsClient.getLatestHistoryFingerprint(ALIAS);
  const messageText = buildPrompt(input);

  await mindsClient.sendMessage({ alias: ALIAS, messageText });
  const outcome = await mindsClient.waitForReply({
    alias: ALIAS,
    timeoutMs: 180_000,
    afterFingerprint: before,
    sentMessageText: messageText,
  });

  if (outcome.timedOut) {
    throw new Error("Mind did not reply with clip packages in time");
  }

  const raw = outcome.reply.messageText ?? "";
  const recipes = parseMindClipRecipes(raw, input.durationSec);
  if (recipes.length === 0) {
    throw new Error("Mind reply parsed but contained no valid clip packages");
  }
  return { recipes, raw };
}

function buildPrompt(input) {
  const limits = Object.entries(PLATFORM_SPECS)
    .map(
      ([platform, spec]) =>
        `${platform}: max ${spec.maxDuration}s, ${spec.aspectRatio}, caption <= ${spec.captionLimit} chars`,
    )
    .join("\n");

  const transcript = input.transcript.slice(0, 12_000);

  return `You are RepostAI, a persistent content-repurposing strategist for one creator.

Tenets:
- NEVER publish. Only propose clip packages for human review.
- NEVER change the creator's core claim. Adapt format and tone only.
- Prefer hook-first clips. Skip long intros unless the creator likes them.
- Ground every timestamp in the transcript. Do not invent moments.

${voiceMemoryPrompt(input.voice)}

Source title: ${input.title}
Duration seconds: ${input.durationSec ?? "unknown"}

Platform limits:
${limits}

Transcript (timestamped):
${transcript}

Return ONLY JSON with this shape:
{
  "clips": [
    {
      "platform": "tiktok" | "instagram" | "x",
      "startSec": number,
      "endSec": number,
      "aspectRatio": "9:16",
      "reason": "why this moment fits the platform",
      "hook": "on-screen first line",
      "caption": "platform copy",
      "hashtags": ["#example"]
    }
  ]
}

Produce exactly one clip per platform (tiktok, instagram, x). Timestamps must exist in the transcript window.`;
}
