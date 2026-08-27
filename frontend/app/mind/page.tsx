"use client";

import { useEffect, useRef, useState } from "react";
import {
  equipMindSkill,
  getMindDesk,
  getMindHistory,
  seedMindTenets,
  sendMindMessage,
  type MindDesk,
  type MindMessage,
} from "@frontend/lib/api";
import { PageHeader } from "@frontend/components/page-header";
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
  const [seeding, setSeeding] = useState(false);

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

  async function seedTenets() {
    setSeeding(true);
    try {
      await seedMindTenets();
      toast.success("Tenets sent into the Mind conversation");
      await loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not seed tenets");
    } finally {
      setSeeding(false);
    }
  }

  async function copyTenets() {
    const text = [
      "NEVER publish. Only propose packages for human review.",
      "NEVER change the creator's core claim. Adapt format and tone only.",
      "Prefer hook-first clips. Skip long intros unless the creator likes them.",
      "Ground every timestamp in the transcript. Do not invent moments.",
    ].join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Tenets copied — paste into Soul on hellominds.ai");
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
        <p className="text-xs text-bad" role="alert">{error}</p>
      </div>
    );
  }

  if (!desk) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto" aria-busy="true">
        <PageHeader
          kicker="Agent"
          title="Mind desk"
          lede="Same persistent conversation the pipeline uses. Telegram is the native channel if it is connected on the Mind."
        />
        <div className="skel h-24 rounded-[var(--radius-xl)]" />
        <div className="skel h-80 rounded-[var(--radius-xl)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader
        kicker="Agent"
        title="Mind desk"
        lede="Same persistent conversation the pipeline uses. Telegram is the native channel if it is connected on the Mind."
      />

      <section className="glass p-5 space-y-3">
        <p className="timecode text-[11px] text-[var(--fg-muted)]">Tenets on every propose</p>
        <h2 className="section-title">What this Mind is not allowed to do</h2>
        <ul className="grid gap-2 sm:grid-cols-2 text-xs text-[var(--fg-muted)]">
          <li className="cell p-3">Never publish. Packages stay on the desk until you review.</li>
          <li className="cell p-3">Never change the creator&apos;s core claim — adapt format and tone only.</li>
          <li className="cell p-3">Hook-first. Skip long intros unless you have said you like them.</li>
          <li className="cell p-3">Timestamps must exist in the transcript. No invented moments.</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => void copyTenets()}>
            Copy for Soul
          </button>
          <button type="button" className="btn btn-primary btn-xs" disabled={seeding || !desk.ok} onClick={() => void seedTenets()}>
            {seeding ? "Sending…" : "Seed into conversation"}
          </button>
        </div>
        <ol className="text-[11px] text-[var(--fg-muted)] space-y-1 list-decimal pl-4">
          <li>
            Open{" "}
            <a href="https://hellominds.ai/profile" target="_blank" rel="noreferrer" className="underline underline-offset-4">
              hellominds.ai/profile
            </a>
            , select Mind RepostAI, paste tenets into Soul.
          </li>
          <li>
            Same page: Link Account for Telegram so web and Telegram share one memory. Refresh this desk after.
          </li>
        </ol>
      </section>

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
          <h2 className="section-title">Conversation</h2>
        </div>
        <div className="max-h-[28rem] overflow-y-auto p-4 space-y-3 bg-[var(--bg-card)]/40">
          {messages.length === 0 ? (
            <p className="text-xs text-[var(--fg-muted)]">No messages yet. Run a job or send a note below.</p>
          ) : (
            messages.map((message) => (
              <article
                key={message.fingerprint || message.messageId}
                className={`cell px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  message.fromMind ? "text-[var(--fg)]" : "border-[var(--border-strong)]"
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
        <h2 className="kicker">Circle</h2>
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
        <h2 className="kicker">Skills</h2>
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
