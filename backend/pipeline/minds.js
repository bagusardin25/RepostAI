import { createMindsClient, parseHumanIdFromBuilderApiKey } from "@animocabrands/minds-client-lib";
import { getSetting, setSetting } from "../db/client.js";
import { PLATFORM_SPECS } from "../lib/constants.js";
import { tenetsSeedMessage } from "../lib/tenets.js";
import { extractJsonObject } from "../lib/json.js";
import { mindPlainText } from "../lib/mind-text.js";
import { parseMindArtifacts } from "./artifacts.js";
import { HIGH, LOW, conversationTurn, createAsker, createTurnQueue } from "./mind-turns.js";
import { parseMindClipRecipes } from "./recipes.js";
import { describeReviewStyle, voiceMemoryPrompt } from "./voice.js";

const ALIAS = process.env.MINDS_CONVERSATION_ALIAS || "main";

// Every request shares one conversation, and waitForReply() takes the first Mind message
// after ours, so packs processed together stole each other's replies and timed out into
// the fallback. All turns now go through one queue, with clip proposals first.
const ask = createAsker({
  enqueue: createTurnQueue(),
  turn: async (prompt, options) => {
    const { mindsClient } = await ensureAlias();
    return conversationTurn(mindsClient, ALIAS, prompt, options);
  },
  store: {
    get: (key) => getSetting(`mind.answer.${key}`),
    set: (key, text) => setSetting(`mind.answer.${key}`, text),
  },
});

export function mindsConfigured() {
  return Boolean(process.env.MINDS_BUILDER_API_KEY);
}

export function conversationAlias() {
  return ALIAS;
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
  const humanId = parseHumanIdFromBuilderApiKey(process.env.MINDS_BUILDER_API_KEY);
  const list = humanId
    ? await mindsClient.listMinds({ humanId })
    : await mindsClient.listMinds();
  const configuredId = process.env.MINDS_MIND_ID;
  const mindId = configuredId || list[0]?.mindId;
  if (!mindId) {
    throw new Error("No Mind found on this Builder account");
  }
  if (configuredId && !list.some((mind) => mind.mindId === configuredId)) {
    throw new Error(`MINDS_MIND_ID ${configuredId} is not on this Builder account`);
  }
  const mind = list.find((item) => item.mindId === mindId) ?? null;
  if (mind && mind.isEnabled === false) {
    throw new Error("Mind is disabled. Enable it in the Minds Builder console.");
  }
  await mindsClient.ensureConversation(ALIAS, mindId);
  return { mindsClient, mindId };
}

export async function mindsHealth() {
  if (!mindsConfigured()) {
    return { configured: false, ok: false };
  }
  try {
    const mindsClient = client();
    const humanId = parseHumanIdFromBuilderApiKey(process.env.MINDS_BUILDER_API_KEY);
    const list = humanId
      ? await mindsClient.listMinds({ humanId })
      : await mindsClient.listMinds();
    const mindId = process.env.MINDS_MIND_ID || list[0]?.mindId || null;
    let profile = null;
    if (mindId) {
      try {
        profile = await mindsClient.getMind(mindId);
      } catch {
        profile = list.find((mind) => mind.mindId === mindId) ?? list[0] ?? null;
      }
    }
    let cognition = null;
    if (mindId) {
      try {
        cognition = (await mindsClient.getCognitionBalance(mindId)).cognition;
      } catch {
        cognition = null;
      }
    }
    const listed = list.find((mind) => mind.mindId === mindId) ?? list[0] ?? null;
    return {
      configured: true,
      ok: Boolean(listed) && listed.isEnabled !== false,
      mindCount: list.length,
      mindId,
      isEnabled: listed?.isEnabled !== false,
      hasTelegram: Boolean(listed?.hasTelegram ?? profile?.hasTelegram),
      mindEmail: profile?.email ?? listed?.email ?? null,
      walletAddress: profile?.walletAddress ?? null,
      cognition,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : "Minds request failed",
    };
  }
}

// How long a pack waits for the Mind in total, queue included, before it falls back. Each
// turn may take up to 180s, so without this cap packs queued behind each other waited about
// three minutes per pack ahead of them, and TestSprite saw fresh packs sit on "Choosing three
// moments" past its five-minute limit.
const PROPOSAL_WAIT_MS = 120_000;

/**
 * `reuseSavedAnswer` (demo samples): a prompt identical to one the Mind already answered,
 * same sample and same learned style, gets that saved answer back instead of a new turn.
 */
export async function proposeClipsWithMinds(input) {
  const answer = await ask(buildPrompt(input), {
    priority: HIGH,
    timeoutMs: 180_000,
    waitMs: PROPOSAL_WAIT_MS,
    reuseSaved: Boolean(input.reuseSavedAnswer),
    accept: (text) => hasClipRecipes(text, input.durationSec),
  });
  if (!answer) {
    throw new Error(`Mind did not reply with clip packages within ${PROPOSAL_WAIT_MS / 1000}s`);
  }
  return {
    recipes: parseMindClipRecipes(answer.text, input.durationSec, input.transcript),
    raw: answer.text,
    artifacts: parseMindArtifacts(answer.text, input.transcript),
    savedAnswer: answer.saved,
  };
}

function hasClipRecipes(text, durationSec) {
  try {
    return parseMindClipRecipes(text, durationSec).length > 0;
  } catch {
    return false;
  }
}

export async function rememberCreatorDecision(input) {
  if (!mindsConfigured()) return { sent: false };
  await ask(buildReviewMemoryMessage(input), { priority: LOW, timeoutMs: 45_000 });
  return { sent: true };
}

export async function rememberReviewSession(input) {
  if (!mindsConfigured()) return { sent: false };
  await ask(buildSessionRecapMessage(input), { priority: LOW, timeoutMs: 45_000 });
  return { sent: true };
}

export async function requestAutonomousFollowUp(input) {
  const fallback = fallbackFollowUp(input.title);
  if (!mindsConfigured()) return fallback;

  try {
    const answer = await ask(buildFollowUpPrompt(input), {
      priority: LOW,
      timeoutMs: 60_000,
      reuseSaved: Boolean(input.reuseSavedAnswer),
      accept: looksLikeFollowUp,
    });
    return answer ? parseFollowUp(answer.text, fallback) : fallback;
  } catch (error) {
    console.warn("Autonomous follow-up failed", error);
    return fallback;
  }
}

function looksLikeFollowUp(text) {
  try {
    const root = extractJsonObject(text);
    return Boolean(root.reminder || root.nextMove || root.next_move);
  } catch {
    return false;
  }
}

export async function sendMindMessage(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("Message is empty");
  if (!mindsConfigured()) throw new Error("MINDS_BUILDER_API_KEY is not set");
  // Waits behind any pack that is talking to the Mind; the reply lands in the conversation.
  ask(trimmed, { priority: LOW, timeoutMs: 60_000 }).catch((error) => {
    console.warn("Mind message failed", error);
  });
  return { ok: true, alias: ALIAS, queued: true };
}

export async function seedMindTenets() {
  return sendMindMessage(tenetsSeedMessage());
}

export async function getMindHistory(limit = 40) {
  if (!mindsConfigured()) return [];
  const { mindsClient } = await ensureAlias();
  const rows = await mindsClient.getHistory(ALIAS, { limit });
  return rows
    .slice()
    .reverse()
    .map((row) => ({
      fingerprint: row.fingerprint,
      messageId: row.messageId ?? row.id ?? row.fingerprint,
      text: mindPlainText(row.messageText ?? row.text ?? ""),
      createdAt: row.createdAt ?? null,
      fromMind: row.senderType === 0 || row.senderType === 2,
      senderName: row.senderName ?? row.mindName ?? (row.senderType === 1 ? "You" : "Mind"),
    }))
    .filter((row) => row.text.trim().length > 0);
}

export async function getMindDesk() {
  if (!mindsConfigured()) {
    return {
      configured: false,
      ok: false,
      alias: ALIAS,
      mind: null,
      circle: [],
      equippedSkills: [],
      bazaarSkills: [],
    };
  }

  try {
    const { mindsClient, mindId } = await ensureAlias();
    const [profile, circle, equippedSkills, bazaarPage, listed, balance] = await Promise.all([
      mindsClient.getMind(mindId).catch(() => null),
      mindsClient.getCircle(mindId).catch(() => []),
      mindsClient.listEquippedSkills(mindId).catch(() => []),
      mindsClient.bazaar.listSkills({ search: "content", page: 1, pageSize: 8 }).catch(() => ({ items: [] })),
      mindsClient.listMinds().then((minds) => minds.find((mind) => mind.mindId === mindId) ?? null).catch(() => null),
      mindsClient.getCognitionBalance(mindId).catch(() => null),
    ]);

    return {
      configured: true,
      ok: listed?.isEnabled !== false,
      alias: ALIAS,
      mind: {
        mindId,
        name: profile?.name ?? listed?.name ?? null,
        email: profile?.email ?? listed?.email ?? null,
        isEnabled: listed?.isEnabled !== false,
        hasTelegram: Boolean(listed?.hasTelegram ?? profile?.hasTelegram),
        telegramBotId: profile?.telegramBotId ?? null,
        walletAddress: profile?.walletAddress ?? null,
        chain: profile?.chain ?? null,
        cognition: balance?.cognition ?? null,
        species: listed?.species ?? profile?.species ?? null,
      },
      circle: Array.isArray(circle) ? circle : [],
      equippedSkills: Array.isArray(equippedSkills) ? equippedSkills : [],
      bazaarSkills: Array.isArray(bazaarPage?.items) ? bazaarPage.items : [],
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      alias: ALIAS,
      error: error instanceof Error ? error.message : "Mind desk failed",
      mind: null,
      circle: [],
      equippedSkills: [],
      bazaarSkills: [],
    };
  }
}

export async function equipBazaarSkill(skillId) {
  const id = String(skillId ?? "").trim();
  if (!id) throw new Error("skillId is required");
  const { mindsClient, mindId } = await ensureAlias();
  return mindsClient.equipSkills(mindId, { ids: [id] });
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
- NEVER publish. Only propose packages for human review.
- NEVER change the creator's core claim. Adapt format and tone only.
- Prefer hook-first clips. Skip long intros unless the creator likes them.
- Ground every timestamp in the transcript. Do not invent moments.
- Earlier messages in this conversation are about other videos. Never reuse their hooks, captions, or reasons. Write hook and caption from THIS transcript only.

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
  ],
  "artifacts": {
    "tiktokScript": { "lines": ["spoken line"], "onScreenText": "short overlay", "cta": "follow prompt" },
    "instagramCarousel": { "slides": [{ "title": "slide title", "body": "slide copy" }] },
    "xThread": { "tweets": ["tweet 1", "tweet 2"] },
    "linkedinPost": { "text": "professional post" }
  }
}

Produce exactly one clip per platform (tiktok, instagram, and x). Timestamps must exist in the transcript window.
Each platform MUST use a different time window (different startSec and endSec). Do not return the same slice three times.
- tiktok: 12–45s. Caption is one or two short spoken lines.
- instagram: 15–50s. Caption states the rule, then the one line that supports it.
- x: 8–25s. Caption is a single sentence under 220 characters.
Start the window on the claim itself. Do not start on a false start, "excuse me", or a broken fragment.
hook = the first intelligible sentence spoken inside that window. Do not paraphrase it into a different claim.
reason = the clock range (m:ss–m:ss) and why that spoken line fits the platform. Never say "second zero" unless startSec is 0.
caption = post text for that platform only. No hashtags in the caption. No "full breakdown" line.
hashtags = words that appear in that clip. tiktok 3–4, instagram 4–5, x 1–2. Do not use #fyp, #repostai, or #creators.
Also produce the four text artifacts. Tweets <= 280 chars. Carousel 4-6 slides. LinkedIn stays professional.`;
}

// The reviewed hook and caption stay out of this message: sent as a "standing preference",
// the Mind reused them word for word on unrelated videos. It gets their shape instead.
export function buildReviewMemoryMessage(input) {
  const lines = [
    "Creator review (do NOT publish):",
    `Video: ${input.title || "source video"}`,
    `Platform: ${input.platform}`,
    `Action: ${input.action}`,
    `Style: ${describeReviewStyle(input)}`,
  ];
  if (input.note) lines.push(`Creator note: ${input.note}`);
  lines.push(
    "Remember the style as a standing preference for future packages on this platform, not the wording: lines from this video must never appear in another video's package. Confirm in one sentence. Do not propose new clips.",
  );
  return lines.join("\n");
}

function buildSessionRecapMessage(input) {
  const rows = (input.clips ?? [])
    .map((clip) => {
      const style =
        clip.status === "edited"
          ? describeReviewStyle({
              action: "edit",
              originalHook: clip.hook,
              editedHook: clip.editedHook,
              originalCaption: clip.caption,
              editedCaption: clip.editedCaption,
            })
          : "";
      return `- ${clip.platform}: ${clip.status}${clip.reviewNote ? ` — ${clip.reviewNote}` : ""}${
        style ? ` → ${style}` : ""
      }`;
    })
    .join("\n");

  return `All packages for "${input.title}" were reviewed. Do NOT publish.

${rows}

Reply with 3 short bullets of what you will do differently on the next job. Describe style, not lines from this video. No new clip JSON.`;
}

function buildFollowUpPrompt(input) {
  const platforms = (input.platforms ?? []).join(", ") || "tiktok, instagram, x";
  return `The clip packages for "${input.title}" are ready for human review. Do not publish.

Platforms: ${platforms}

Write a short autonomous follow-up as JSON only:
{
  "reminder": "one sentence on how you adapted from learned voice",
  "nextMove": "what the creator should do next"
}`;
}

function parseFollowUp(text, fallback) {
  try {
    const root = extractJsonObject(text);
    const reminder = String(root.reminder ?? root.message ?? "").trim();
    const nextMove = String(root.nextMove ?? root.next_move ?? root.cta ?? "").trim();
    if (!reminder && !nextMove) return fallback;
    return {
      reminder: reminder || fallback.reminder,
      nextMove: nextMove || fallback.nextMove,
    };
  } catch {
    const trimmed = String(text).trim();
    if (!trimmed) return fallback;
    return { reminder: trimmed.slice(0, 280), nextMove: fallback.nextMove };
  }
}

function fallbackFollowUp(title) {
  return {
    reminder: `Packages for "${title}" are ready. Nothing ships until you review them.`,
    nextMove: "Approve, edit, or reject each clip so I remember your voice on the next job.",
  };
}
