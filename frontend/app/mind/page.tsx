"use client";

import { useEffect, useRef, useState } from "react";
import {
  equipMindSkill,
  getMindDesk,
  getMindHistory,
  sendMindMessage,
  type MindDesk,
  type MindMessage,
} from "@frontend/lib/api";
import { useToast } from "@frontend/components/toast";

export default function MindPage() {
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [desk, setDesk] = useState<MindDesk | null>(null);
  const [messages, setMessages] = useState<MindMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [equipping, setEquipping] = useState<string | null>(null);

  async function loadHistory() {
    const { messages: next } = await getMindHistory(50);
    setMessages(next);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMindDesk(), getMindHistory(50)])
      .then(([nextDesk, history]) => {
        if (cancelled) return;
        setDesk(nextDesk);
        setMessages(history.messages);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load Mind desk");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const last = messages.at(-1);
    if (!last || last.fromMind) return;
    const timer = setTimeout(() => {
      void loadHistory().catch(() => undefined);
    }, 4000);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await sendMindMessage(text);
      setDraft("");
      toast.success("Sent to Mind");
      await loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function equip(skillId: string) {
    setEquipping(skillId);
    try {
      await equipMindSkill(skillId);
      toast.success("Skill equipped");
      setDesk(await getMindDesk());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not equip skill");
    } finally {
      setEquipping(null);
    }
  }

  if (error) {
    return (
      <div className="panel p-8 text-center space-y-3 max-w-md mx-auto">
        <p className="text-xs text-rose-500" role="alert">{error}</p>
      </div>
    );
  }

  if (!desk) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="skel h-24 rounded-xl" />
        <div className="skel h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="space-y-1 border-b border-[var(--border)] pb-5">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--fg-bright)]">
          Mind desk
        </h1>
        <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed">
          Same persistent conversation the pipeline uses. Telegram is the native channel if it is connected on the Mind.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="panel p-4 space-y-1">
          <p className="timecode text-[11px] text-[var(--fg-muted)]">Agent</p>
          <p className="text-sm font-semibold text-[var(--fg)]">{desk.mind?.name || "RepostAI Mind"}</p>
          <p className="text-xs text-[var(--fg-muted)]">
            {desk.alias} · {desk.mind?.isEnabled === false ? "disabled" : desk.ok ? "online" : "offline"}
            {desk.mind?.cognition != null ? ` · cognition ${Number(desk.mind.cognition).toFixed(1)}` : ""}
          </p>
        </article>
        <article className="panel p-4 space-y-1">
          <p className="timecode text-[11px] text-[var(--fg-muted)]">Telegram</p>
          <p className="text-sm font-semibold text-[var(--fg)]">
            {desk.mind?.hasTelegram ? "Connected" : "Not connected"}
          </p>
          <p className="text-xs text-[var(--fg-muted)]">
            {desk.mind?.hasTelegram
              ? "Talk to the Mind in Telegram — memory is shared."
              : "Connect Telegram in the Minds Builder console."}
          </p>
        </article>
        <article className="panel p-4 space-y-1">
          <p className="timecode text-[11px] text-[var(--fg-muted)]">Email / wallet</p>
          <p className="text-xs text-[var(--fg)] break-all">{desk.mind?.email || "No Mind email yet"}</p>
          <p className="text-xs text-[var(--fg-muted)] break-all">
            {desk.mind?.walletAddress || "No wallet on this Mind"}
          </p>
        </article>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--fg)]">Conversation</h2>
        </div>
        <div className="max-h-[28rem] overflow-y-auto p-4 space-y-3 bg-[var(--bg-card)]/40">
          {messages.length === 0 ? (
            <p className="text-xs text-[var(--fg-muted)]">No messages yet. Run a job or send a note below.</p>
          ) : (
            messages.map((message) => (
              <article
                key={message.fingerprint || message.messageId}
                className={`rounded-lg border px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  message.fromMind
                    ? "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--fg)]"
                    : "border-[var(--border-strong)] bg-[var(--bg-card)] text-[var(--fg)]"
                }`}
              >
                <p className="timecode text-[10px] text-[var(--fg-muted)] mb-1">
                  {message.fromMind ? "Mind" : "You"}
                </p>
                {message.text}
              </article>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        <form
          className="flex gap-2 border-t border-[var(--border)] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the Mind (this is the web stand-in for Telegram)"
            className="field flex-1 text-sm"
            disabled={sending || !desk.ok}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !draft.trim() || !desk.ok}>
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[var(--fg)] uppercase tracking-wider timecode">Circle</h2>
        {desk.circle.length === 0 ? (
          <p className="text-xs text-[var(--fg-muted)]">
            Single-agent mode. Add another Mind in the Builder console if you want a quality reviewer in the circle.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {desk.circle.map((member) => (
              <li key={member.email || member.name} className="panel p-3 text-xs">
                <p className="font-medium text-[var(--fg)]">{member.name || member.email}</p>
                <p className="text-[var(--fg-muted)]">{member.isSteward ? "Steward" : member.email}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[var(--fg)] uppercase tracking-wider timecode">Skills</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="panel p-4 space-y-2">
            <h3 className="text-xs font-semibold text-[var(--fg)]">Equipped</h3>
            {desk.equippedSkills.length === 0 ? (
              <p className="text-xs text-[var(--fg-muted)]">None equipped yet. The clip playbook currently lives in the prompt.</p>
            ) : (
              <ul className="space-y-1.5 text-xs text-[var(--fg-muted)]">
                {desk.equippedSkills.map((skill) => (
                  <li key={skill.skillId}>{skill.name || skill.skillId}</li>
                ))}
              </ul>
            )}
          </article>
          <article className="panel p-4 space-y-2">
            <h3 className="text-xs font-semibold text-[var(--fg)]">Bazaar (content)</h3>
            {desk.bazaarSkills.length === 0 ? (
              <p className="text-xs text-[var(--fg-muted)]">No matching Bazaar skills returned.</p>
            ) : (
              <ul className="space-y-2">
                {desk.bazaarSkills.map((skill) => (
                  <li key={skill.skillId} className="flex items-start justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span className="text-[var(--fg)] font-medium">{skill.name}</span>
                      {skill.description ? (
                        <span className="block text-[var(--fg-muted)] line-clamp-2">{skill.description}</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs shrink-0"
                      disabled={equipping === skill.skillId}
                      onClick={() => void equip(skill.skillId)}
                    >
                      {equipping === skill.skillId ? "…" : "Equip"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
