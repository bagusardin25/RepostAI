import { createMindsClient, parseHumanIdFromBuilderApiKey } from "@animocabrands/minds-client-lib";
import { PLATFORM_SPECS } from "../lib/constants.js";
import { tenetsSeedMessage } from "../lib/tenets.js";
import { extractJsonObject } from "../lib/json.js";
import { mindPlainText } from "../lib/mind-text.js";
import { parseMindArtifacts } from "./artifacts.js";
import { parseMindClipRecipes } from "./recipes.js";
import { voiceMemoryPrompt } from "./voice.js";

const ALIAS = process.env.MINDS_CONVERSATION_ALIAS || "main";

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

export async function proposeClipsWithMinds(input) {
  const { mindsClient } = await ensureAlias();
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

  const raw = mindPlainText(outcome.reply.messageText ?? "");
  const recipes = parseMindClipRecipes(raw, input.durationSec);
  if (recipes.length === 0) {
    throw new Error("Mind reply parsed but contained no valid clip packages");
  }
  return {
    recipes,
    raw,
    artifacts: parseMindArtifacts(raw, input.transcript),
  };
}

export async function rememberCreatorDecision(input) {
  if (!mindsConfigured()) return { sent: false };
  const { mindsClient } = await ensureAlias();
  await mindsClient.sendMessage({
    alias: ALIAS,
    messageText: buildReviewMemoryMessage(input),
  });
  return { sent: true };
}

export async function rememberReviewSession(input) {
  if (!mindsConfigured()) return { sent: false };
  const { mindsClient } = await ensureAlias();
  await mindsClient.sendMessage({
    alias: ALIAS,
    messageText: buildSessionRecapMessage(input),
  });
  return { sent: true };
}

export async function requestAutonomousFollowUp(input) {
  const fallback = fallbackFollowUp(input.title);
  if (!mindsConfigured()) return fallback;

  try {
    const { mindsClient } = await ensureAlias();
    const before = await mindsClient.getLatestHistoryFingerprint(ALIAS);
    const messageText = buildFollowUpPrompt(input);
    await mindsClient.sendMessage({ alias: ALIAS, messageText });
    const outcome = await mindsClient.waitForReply({
      alias: ALIAS,
      timeoutMs: 60_000,
      afterFingerprint: before,
      sentMessageText: messageText,
    });
    if (outcome.timedOut) return fallback;
    return parseFollowUp(mindPlainText(outcome.reply.messageText ?? ""), fallback);
  } catch (error) {
    console.warn("Autonomous follow-up failed", error);
    return fallback;
  }
}

export async function sendMindMessage(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("Message is empty");
  const { mindsClient } = await ensureAlias();
  await mindsClient.sendMessage({ alias: ALIAS, messageText: trimmed });
  return { ok: true, alias: ALIAS };
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

Produce exactly one clip per platform (tiktok, instagram, x). Timestamps must exist in the transcript window.
Each platform MUST use a different time window (different startSec and endSec). Do not return the same slice three times.
- tiktok: hook-first opening, usually 12–45s
- instagram: a mid-video explanatory beat, usually 15–50s
- x: a short closing takeaway, usually 8–25s
If the source is shorter than 40s, still offset the windows (opening / middle / end) instead of cloning one range.
hook = the on-screen first line spoken in the first seconds of THAT clip.
caption = the post text pasted under the video. Put hashtags only in the hashtags array, not inside caption.
Also produce the four text artifacts. Tweets <= 280 chars. Carousel 4-6 slides. LinkedIn stays professional.`;
}

function buildReviewMemoryMessage(input) {
  const lines = [
    "Creator review (do NOT publish):",
    `Platform: ${input.platform}`,
    `Action: ${input.action}`,
    `Original hook: ${input.originalHook || "(unchanged)"}`,
    `Original caption: ${input.originalCaption || ""}`,
  ];
  if (input.action === "edit") {
    if (input.editedHook) lines.push(`Rewritten hook: ${input.editedHook}`);
    if (input.editedCaption) lines.push(`Rewritten caption: ${input.editedCaption}`);
  }
  if (input.note) lines.push(`Creator note: ${input.note}`);
  lines.push(
    "Remember this as a standing preference for future packages on this platform. Confirm in one sentence. Do not propose new clips.",
  );
  return lines.join("\n");
}

function buildSessionRecapMessage(input) {
  const rows = (input.clips ?? [])
    .map((clip) => {
      const caption = clip.editedCaption || clip.caption || "";
      return `- ${clip.platform}: ${clip.status}${clip.reviewNote ? ` — ${clip.reviewNote}` : ""}${
        clip.status === "edited" ? ` → ${caption.slice(0, 140)}` : ""
      }`;
    })
    .join("\n");

  return `All packages for "${input.title}" were reviewed. Do NOT publish.

${rows}

Reply with 3 short bullets of what you will do differently on the next job. No new clip JSON.`;
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
