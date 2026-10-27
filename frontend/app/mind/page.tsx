"use client";

import Link from "next/link";
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
import { IconChevronRight } from "@frontend/components/icons";

export default function MindPage() {
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [desk, setDesk] = useState<MindDesk | null>(null);
  const [messages, setMessages] = useState<MindMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "error">("loading");
  const [sending, setSending] = useState(false);
  const [equipping, setEquipping] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);

  async function loadHistory() {
    const { messages: next } = await getMindHistory(50);
    setMessages(next);
    setHistoryState("ready");
  }

  useEffect(() => {
    let cancelled = false;
    // The page does not wait for the Minds API: the rules are static, and a slow or failing
    // Mind only affects the status card and the conversation.
    getMindDesk()
      .then((nextDesk) => {
        if (!cancelled) setDesk(nextDesk);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load Mind");
      });
    // The Minds API fails now and then and answers the next call, so try the history a few times
    // before saying it could not be loaded.
    void (async () => {
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const history = await getMindHistory(50);
          if (cancelled) return;
          setMessages(history.messages);
          setHistoryState("ready");
          return;
        } catch {
          if (cancelled) return;
          if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        }
      }
      if (!cancelled) setHistoryState("error");
    })();
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
    if (!conversationOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, conversationOpen]);

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
      toast.success("Rules sent to the Mind");
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
    toast.success("Rules copied. Paste them into Soul on hellominds.ai.");
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

  const checking = !desk && !error;
  const online = Boolean(desk?.ok) && desk?.mind?.isEnabled !== false;
  const statusLabel = desk?.mind?.isEnabled === false ? "Disabled" : online ? "Connected" : "Offline";
  const offlineReason = desk?.error ?? error;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader
        kicker="Mind"
        title="The agent behind the cuts"
        lede="It picks the three moments and drafts the posts. You review, copy and post them yourself."
        actions={
          <Link href="/desk" className="btn btn-primary btn-sm">
            Back to desk
          </Link>
        }
      />

      <section className="panel p-5 sm:p-6 space-y-4" aria-busy={checking}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="timecode text-[11px] text-[var(--fg-muted)]">{desk?.mind?.name || "RepostAI Mind"}</p>
            <h2 className="section-title">
              {checking
                ? "Checking the Mind…"
                : online
                  ? "Ready to pick moments"
                  : "Offline. The built-in picker can still cut clips."}
            </h2>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed max-w-lg">
              You do not need this page to review clips. Style is taught from Approve, Save & approve, and Reject on the desk.
            </p>
          </div>
          {/* Until the Mind answers, the status is a placeholder rather than a label that could be read as the result. */}
          {checking ? (
            <span className="skel h-6 w-24 rounded-full" aria-hidden="true" />
          ) : (
            <span className={`pill ${online ? "pill-ok" : "pill-warn"}`}>{statusLabel}</span>
          )}
        </div>
        {!checking && !online && offlineReason && (
          <p className="text-xs text-bad" role="alert">{offlineReason}</p>
        )}
      </section>

      <div>
        <details
          className="disclosure panel"
          onToggle={(event) => setConversationOpen((event.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="px-1 py-[1.125rem]">
            <span className="flex items-center gap-2 min-w-0">
              <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
              <span>
                <span className="section-title block">Conversation</span>
                <span className="text-xs text-[var(--fg-muted)]">
                  {historyState === "loading"
                    ? "Loading…"
                    : historyState === "error"
                      ? "Could not load"
                      : messages.length === 0
                        ? "No messages yet"
                        : `${messages.length} messages`}
                </span>
              </span>
            </span>
          </summary>
          <div className="border-t border-[var(--border)]">
            <div className="max-h-[28rem] overflow-y-auto p-4 space-y-3 bg-[var(--bg-card)]/40">
              {historyState === "loading" ? (
                <p className="text-xs text-[var(--fg-muted)]">Loading the conversation…</p>
              ) : historyState === "error" ? (
                <p className="text-xs text-bad" role="alert">
                  Could not load the conversation right now. The Minds service did not answer.
                </p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)]">No messages yet. Run a job or send a note below.</p>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.fingerprint || message.messageId}
                    className={`cell px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap animate-fade-in-up ${
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
              {sending && (
                <div className="cell px-3 py-2.5 text-xs text-[var(--fg-muted)] flex items-center gap-2 animate-fade-in-up w-fit">
                  <span className="timecode text-[10px]">Mind thinking</span>
                  <div className="flex items-center gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
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
                placeholder="Optional note to the Mind"
                aria-label="Optional note to the Mind"
                className="field flex-1 text-sm"
                disabled={sending || !desk?.ok}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !draft.trim() || !desk?.ok}>
                {sending ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </details>

        <details className="disclosure panel">
          <summary className="px-1 py-[1.125rem]">
            <span className="flex items-center gap-2 min-w-0">
              <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
              <span>
                <span className="section-title block">Rules and setup</span>
                <span className="text-xs text-[var(--fg-muted)]">
                  Never publish · Telegram {desk?.mind?.hasTelegram ? "connected" : "not connected"}
                </span>
              </span>
            </span>
          </summary>
          <div className="px-1 pb-6 space-y-4 border-t border-[var(--border)] pt-5">
            <ul className="grid gap-2 sm:grid-cols-2 text-xs text-[var(--fg-muted)]">
              <li className="cell p-3">Never publish. Packs stay on the desk until you review.</li>
              <li className="cell p-3">Never change the core claim. Adapt format and tone only.</li>
              <li className="cell p-3">Hook-first. Skip long intros unless you have said you like them.</li>
              <li className="cell p-3">Timestamps must exist in the transcript. No invented moments.</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => void copyTenets()}>
                Copy rules
              </button>
              <button type="button" className="btn btn-ghost btn-xs" disabled={seeding || !desk?.ok} onClick={() => void seedTenets()}>
                {seeding ? "Sending…" : "Send rules to Mind"}
              </button>
            </div>
            <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
              Optional: paste those rules into Soul on{" "}
              <a href="https://hellominds.ai/profile" target="_blank" rel="noreferrer" className="underline underline-offset-4">
                hellominds.ai/profile
              </a>
              , and link Telegram if you want the same memory there.
            </p>
          </div>
        </details>

        <details className="disclosure panel">
          <summary className="px-1 py-[1.125rem]">
            <span className="flex items-center gap-2 min-w-0">
              <IconChevronRight className="disclosure-chevron h-3.5 w-3.5 text-[var(--fg-muted)]" aria-hidden="true" />
              <span>
                <span className="section-title block">Agent details</span>
                <span className="text-xs text-[var(--fg-muted)]">Skills, circle, and account</span>
              </span>
            </span>
          </summary>
          <div className="px-1 pb-6 space-y-4 border-t border-[var(--border)] pt-5">
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <p className="cell p-3 text-[var(--fg-muted)]">
                Alias <span className="block text-[var(--fg)] break-all">{desk?.alias ?? "…"}</span>
              </p>
              <p className="cell p-3 text-[var(--fg-muted)]">
                Email <span className="block text-[var(--fg)] break-all">{desk?.mind?.email || (desk ? "None yet" : "…")}</span>
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[var(--fg)]">Equipped skills</h3>
              {(desk?.equippedSkills ?? []).length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)]">None equipped. The clip playbook currently lives in the prompt.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-[var(--fg-muted)]">
                  {(desk?.equippedSkills ?? []).map((skill) => (
                    <li key={skill.skillId}>{skill.name || skill.skillId}</li>
                  ))}
                </ul>
              )}
            </div>

            {(desk?.bazaarSkills ?? []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--fg)]">Available skills</h3>
                <ul className="space-y-2">
                  {(desk?.bazaarSkills ?? []).map((skill) => (
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
              </div>
            )}

            {(desk?.circle ?? []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--fg)]">Circle</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {(desk?.circle ?? []).map((member) => (
                    <li key={member.email || member.name} className="cell p-3 text-xs">
                      <p className="font-medium text-[var(--fg)]">{member.name || member.email}</p>
                      <p className="text-[var(--fg-muted)]">{member.isSteward ? "Steward" : member.email}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
