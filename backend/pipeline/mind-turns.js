import { createHash } from "node:crypto";
import { mindPlainText } from "../lib/mind-text.js";

export const HIGH = 0;
export const LOW = 1;

/** Runs one conversation turn at a time; HIGH turns go ahead of LOW turns still waiting. */
export function createTurnQueue() {
  const lanes = [[], []];
  let busy = false;

  function next() {
    if (busy) return;
    const item = lanes[HIGH].shift() ?? lanes[LOW].shift();
    if (!item) return;
    busy = true;
    Promise.resolve()
      .then(item.task)
      .then(item.resolve, item.reject)
      .finally(() => {
        busy = false;
        next();
      });
  }

  return function enqueue(task, priority = LOW) {
    return new Promise((resolve, reject) => {
      lanes[priority].push({ task, resolve, reject });
      next();
    });
  };
}

/**
 * Sends one message and waits for its reply. waitForReply() returns the first Mind
 * message after ours, which can be a late answer to an earlier turn, so replies that
 * `accept` rejects are skipped and the wait continues until the deadline.
 */
export async function conversationTurn(client, alias, messageText, { timeoutMs, accept = () => true }) {
  let after = await client.getLatestHistoryFingerprint(alias);
  await client.sendMessage({ alias, messageText });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const outcome = await client.waitForReply({
      alias,
      timeoutMs: deadline - Date.now(),
      afterFingerprint: after,
      sentMessageText: messageText,
    });
    if (outcome.timedOut) return null;
    const text = mindPlainText(outcome.reply.messageText ?? "");
    if (accept(text)) return text;
    console.warn(`Mind reply skipped, this turn does not accept it: ${text.replace(/\s+/g, " ").slice(0, 120)}`);
    const fingerprint = outcome.reply.fingerprint;
    if (!fingerprint || fingerprint === after) return null;
    after = fingerprint;
  }
  return null;
}

export function promptKey(prompt) {
  return createHash("sha256").update(prompt).digest("hex");
}

// A turn needs time to find the conversation, send, and hear back. With less left than
// this, it is skipped rather than sending a message nobody is waiting for.
export const MIN_TURN_MS = 15_000;

/**
 * Asks the Mind through the queue. Identical prompts already in flight share one turn.
 * With `reuseSaved`, a prompt answered before gets its saved answer back without a turn.
 * With `waitMs`, the caller waits at most that long in total, queue included: its turn only
 * gets the time left, and is skipped when it would start with less than `minTurnMs`.
 */
export function createAsker({ enqueue, turn, store, minTurnMs = MIN_TURN_MS }) {
  const inflight = new Map();

  return async function ask(prompt, { priority = LOW, timeoutMs, accept, reuseSaved = false, waitMs }) {
    const deadline = waitMs ? Date.now() + waitMs : null;
    const key = promptKey(prompt);
    if (reuseSaved) {
      const saved = await store.get(key);
      if (saved && (!accept || accept(saved))) return { text: saved, saved: true };
    }
    if (!inflight.has(key)) {
      const runTurn = () => {
        if (!deadline) return turn(prompt, { timeoutMs, accept });
        const left = deadline - Date.now();
        if (left < minTurnMs) {
          console.warn("Mind turn skipped, its caller stopped waiting in the queue");
          return null;
        }
        return turn(prompt, { timeoutMs: Math.min(timeoutMs ?? left, left), accept });
      };
      const pending = enqueue(runTurn, priority)
        .then(async (text) => {
          if (text && reuseSaved) {
            try {
              await store.set(key, text);
            } catch (error) {
              console.warn("Could not save the Mind answer", error);
            }
          }
          return text;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    const shared = inflight.get(key);
    const text = await (deadline ? within(shared, deadline - Date.now()) : shared);
    return text ? { text, saved: false } : null;
  };
}

/** Settles like `promise`, or resolves null once `ms` have passed. */
function within(promise, ms) {
  let timer;
  const expired = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), Math.max(0, ms));
  });
  return Promise.race([promise, expired]).finally(() => clearTimeout(timer));
}
