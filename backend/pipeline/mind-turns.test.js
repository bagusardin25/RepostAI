import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HIGH, LOW, conversationTurn, createAsker, createTurnQueue } from "./mind-turns.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("turn queue", () => {
  it("runs one turn at a time and lets HIGH turns jump waiting LOW turns", async () => {
    const enqueue = createTurnQueue();
    const order = [];
    let active = 0;
    let peak = 0;
    const turn = (name) => async () => {
      active += 1;
      peak = Math.max(peak, active);
      order.push(name);
      await wait(5);
      active -= 1;
    };
    await Promise.all([
      enqueue(turn("review-1"), LOW),
      enqueue(turn("review-2"), LOW),
      enqueue(turn("propose"), HIGH),
    ]);
    assert.equal(peak, 1);
    assert.deepEqual(order, ["review-1", "propose", "review-2"]);
  });

  it("keeps going after a failed turn", async () => {
    const enqueue = createTurnQueue();
    const failed = enqueue(async () => {
      throw new Error("boom");
    });
    const next = enqueue(async () => "ok");
    await assert.rejects(failed, /boom/);
    assert.equal(await next, "ok");
  });
});

function fakeClient(replies) {
  const sent = [];
  const waits = [];
  return {
    sent,
    waits,
    getLatestHistoryFingerprint: async () => "f0",
    sendMessage: async ({ messageText }) => sent.push(messageText),
    waitForReply: async (opts) => {
      waits.push(opts.afterFingerprint);
      const next = replies.shift();
      return next ? { reply: next, timedOut: false } : { timedOut: true };
    },
  };
}

describe("conversationTurn", () => {
  it("skips a stray reply and returns the one this turn accepts", async () => {
    const client = fakeClient([
      { messageText: "Confirmed - X clips will skip cold intros.", fingerprint: "f1" },
      { messageText: '{"clips": []}', fingerprint: "f2" },
    ]);
    const text = await conversationTurn(client, "main", "propose", {
      timeoutMs: 1000,
      accept: (reply) => reply.startsWith("{"),
    });
    assert.equal(text, '{"clips": []}');
    assert.deepEqual(client.sent, ["propose"]);
    assert.deepEqual(client.waits, ["f0", "f1"]);
  });

  it("returns null when the Mind does not answer in time", async () => {
    const client = fakeClient([]);
    assert.equal(await conversationTurn(client, "main", "hello", { timeoutMs: 50 }), null);
  });
});

function memoryStore() {
  const map = new Map();
  return { map, get: async (key) => map.get(key) ?? null, set: async (key, value) => map.set(key, value) };
}

describe("createAsker", () => {
  it("shares one turn between identical prompts in flight", async () => {
    let turns = 0;
    const ask = createAsker({
      enqueue: createTurnQueue(),
      turn: async () => {
        turns += 1;
        await wait(10);
        return "answer";
      },
      store: memoryStore(),
    });
    const answers = await Promise.all([ask("same prompt", {}), ask("same prompt", {}), ask("same prompt", {})]);
    assert.equal(turns, 1);
    assert.deepEqual(answers, Array(3).fill({ text: "answer", saved: false }));
  });

  it("saves answers for reuse and serves them without a new turn", async () => {
    let turns = 0;
    const store = memoryStore();
    const ask = createAsker({
      enqueue: createTurnQueue(),
      turn: async () => {
        turns += 1;
        return "clips json";
      },
      store,
    });
    assert.deepEqual(await ask("sample prompt", { reuseSaved: true }), { text: "clips json", saved: false });
    assert.deepEqual(await ask("sample prompt", { reuseSaved: true }), { text: "clips json", saved: true });
    assert.equal(turns, 1);

    await ask("other prompt", { reuseSaved: true });
    assert.equal(turns, 2, "a different prompt (new style or sample) still asks the Mind");
  });

  it("does not save answers unless reuse was asked for", async () => {
    const store = memoryStore();
    const ask = createAsker({ enqueue: createTurnQueue(), turn: async () => "Confirmed.", store });
    await ask("review message", {});
    assert.equal(store.map.size, 0);
  });

  it("ignores a saved answer the caller no longer accepts", async () => {
    let turns = 0;
    const store = memoryStore();
    const ask = createAsker({
      enqueue: createTurnQueue(),
      turn: async () => {
        turns += 1;
        return turns === 1 ? "no clips here" : "clips json";
      },
      store,
    });
    await ask("p", { reuseSaved: true });
    const second = await ask("p", { reuseSaved: true, accept: (text) => text === "clips json" });
    assert.deepEqual(second, { text: "clips json", saved: false });
    assert.equal(turns, 2);
  });

  it("returns null when the turn gets no answer", async () => {
    const ask = createAsker({ enqueue: createTurnQueue(), turn: async () => null, store: memoryStore() });
    assert.equal(await ask("x", { reuseSaved: true }), null);
  });

  it("stops waiting at waitMs, queue included, and never sends the skipped turn", async () => {
    const sent = [];
    const ask = createAsker({
      enqueue: createTurnQueue(),
      turn: async (prompt) => {
        sent.push(prompt);
        await wait(prompt === "pack 1" ? 200 : 1);
        return `${prompt} clips`;
      },
      store: memoryStore(),
      minTurnMs: 10,
    });

    const first = ask("pack 1", { priority: HIGH, timeoutMs: 1000 });
    const started = Date.now();
    const second = await ask("pack 2", { priority: HIGH, timeoutMs: 1000, waitMs: 30 });
    assert.equal(second, null);
    assert.ok(Date.now() - started < 150, "pack 2 did not wait for pack 1's turn");

    assert.deepEqual(await first, { text: "pack 1 clips", saved: false });
    await wait(5);
    assert.deepEqual(sent, ["pack 1"]);
  });

  it("gives a turn only the time its caller has left", async () => {
    let given = null;
    const ask = createAsker({
      enqueue: createTurnQueue(),
      turn: async (_prompt, { timeoutMs }) => {
        given = timeoutMs;
        return "clips";
      },
      store: memoryStore(),
    });
    await ask("pack", { priority: HIGH, timeoutMs: 180_000, waitMs: 120_000 });
    assert.ok(given > 119_000 && given <= 120_000, `turn got ${given}ms`);
  });
});
