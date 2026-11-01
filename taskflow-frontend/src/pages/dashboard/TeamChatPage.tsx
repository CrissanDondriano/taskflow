import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Send, Trash2, Search, AtSign, Sparkles, X } from "lucide-react";
import { GlassPanel, Avatar, EmptyState } from "../../components/ui/Primitives";
import { Button } from "../../components/ui/Button";
import { useTeamMembers } from "../../context/TeamContext";
import { useTeamStore } from "../../stores/teamStore";
import { useAuthStore } from "../../stores/authStore";
import { useTasksData } from "../../context/TasksContext";
import { api, ApiError } from "../../lib/api";
import { initialsOf } from "../../lib/format";

interface ChatMessage {
  id: number;
  body: string;
  created_at: string | null;
  user: { id: number; name: string } | null;
}

const POLL_MS = 4000;

export function TeamChatPage() {
  const team = useTeamStore((s) => s.team);
  const members = useTeamMembers();
  const user = useAuthStore((s) => s.user);
  const tasks = useTasksData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMember, setFilterMember] = useState<number | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (quiet: boolean) => {
      if (!team) return;
      try {
        const res = await api.get<{ data: ChatMessage[] }>(`/teams/${team.id}/messages`);
        setMessages(res.data);
        if (!quiet) setLoading(false);
        setError(null);
      } catch (err) {
        if (!quiet) {
          setError(err instanceof ApiError ? err.message : "Couldn't load messages.");
          setLoading(false);
        }
      }
    },
    [team]
  );

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setError(null);
    void load(false);
    if (!team) return;
    const timer = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [team, load]);

  function nearBottom(): boolean {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  useEffect(() => {
    if (nearBottom()) bottomRef.current?.scrollIntoView?.({ behavior: "auto", block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || !team) return;
    setSending(true);
    try {
      const res = await api.post<{ data: ChatMessage }>(`/teams/${team.id}/messages`, { body });
      setMessages((prev) => [...prev, res.data]);
      setDraft("");
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: number) {
    if (!team) return;
    const previous = messages;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await api.delete(`/teams/${team.id}/messages/${id}`);
    } catch (err) {
      setMessages(previous);
      setError(err instanceof ApiError ? err.message : "Couldn't delete that message.");
    }
  }

  function colorFor(userId: number | null, name: string): string {
    const member = members.find((m) => (userId !== null && m.id === userId) || m.name === name);
    return member?.color ?? "#2563EB";
  }

  const canDelete = (m: ChatMessage) =>
    user !== null && (m.user?.id === user.id || user.role === "admin" || user.role === "manager");

  // Linked tasks: tasks whose title appears in any message body.
  const linkedTasks = useMemo(() => {
    const haystack = messages.map((m) => m.body.toLowerCase()).join("\n");
    return tasks.filter((t) => t.title.length > 3 && haystack.includes(t.title.toLowerCase()));
  }, [messages, tasks]);

  // Day dividers.
  function dayLabel(iso: string | null): string {
    if (!iso) return "Today";
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((today.getTime() - that.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  const filteredMessages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (filterMember !== null && m.user?.id !== filterMember) return false;
      if (q && !m.body.toLowerCase().includes(q) && !(m.user?.name.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [messages, search, filterMember]);

  function buildDigest() {
    const recent = messages.slice(-20);
    if (recent.length === 0) { setDigest("No messages yet."); return; }
    const people = new Set(recent.map((m) => m.user?.name).filter(Boolean));
    const taskMentions = linkedTasks.map((t) => t.title).slice(0, 4);
    const last = recent[recent.length - 1];
    const lines = [
      `${recent.length} message${recent.length === 1 ? "" : "s"} from ${people.size} ${people.size === 1 ? "person" : "people"} in the last window.`,
      taskMentions.length ? `Tasks mentioned: ${taskMentions.join(", ")}.` : "No tasks mentioned yet.",
      last?.body ? `Latest: "${last.body.slice(0, 80)}${last.body.length > 80 ? "…" : ""}"` : "",
    ].filter(Boolean);
    setDigest(lines.join(" "));
  }

  if (!team) {
    return (
      <GlassPanel className="p-5">
        <EmptyState
          icon={<MessageSquare size={22} />}
          message="Chat lives on your team — invite a member first and this room opens up."
          action={
            <Link to="/dashboard/team" className="text-[13px] font-medium hover:underline" style={{ color: "var(--tf-primary)" }}>
              Go to the Team page →
            </Link>
          }
        />
      </GlassPanel>
    );
  }

  // Group filtered messages by day for dividers.
  const grouped: { label: string; items: ChatMessage[] }[] = [];
  for (const m of filteredMessages) {
    const label = dayLabel(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) last.items.push(m);
    else grouped.push({ label, items: [m] });
  }

  return (
    <div className="flex h-[calc(100dvh-170px)] min-h-[520px] rounded-2xl overflow-hidden" style={{ border: "1px solid var(--tf-panel-border)", background: "var(--tf-panel)" }}>
      {/* Left rail */}
      <aside className="w-[280px] shrink-0 flex flex-col border-r" style={{ borderColor: "var(--tf-panel-border)", background: "var(--tf-surface)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--tf-panel-border)" }}>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-ink-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              aria-label="Search messages"
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] outline-none"
              style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto tf-scroll p-3 flex flex-col gap-4">
          <section>
            <div className="px-2 pb-1.5 text-[10.5px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--tf-ink-muted)" }}>
              Channels
            </div>
            <button
              onClick={() => { setFilterMember(null); setSearch(""); }}
              className="w-full flex items-center gap-2.5 h-9 px-2 rounded-xl text-[13px] transition-colors"
              style={{ background: "var(--tf-fill-06)", color: "var(--tf-ink)" }}
            >
              <span style={{ color: "var(--tf-ink-muted)" }}>#</span>
              <span className="flex-1 text-left truncate">{team.name}</span>
              <span className="text-[10.5px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>{messages.length}</span>
            </button>
          </section>
          <section>
            <div className="px-2 pb-1.5 text-[10.5px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--tf-ink-muted)" }}>
              Team · click to filter
            </div>
            <div className="flex flex-col gap-0.5">
              {members.map((m) => {
                const active = filterMember === m.id;
                return (
                  <button
                    key={m.initials}
                    onClick={() => setFilterMember(active ? null : (m.id ?? null))}
                    className="w-full flex items-center gap-2.5 h-9 px-2 rounded-xl text-[13px] transition-colors"
                    style={{ background: active ? "var(--tf-fill-06)" : "transparent", color: active ? "var(--tf-ink)" : "var(--tf-ink-muted)" }}
                  >
                    <span className="relative shrink-0">
                      <Avatar initials={m.initials} color={m.color} size={22} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: m.status === "online" ? "var(--tf-success)" : m.status === "away" ? "var(--tf-warning)" : "var(--tf-ink-muted)", border: "1.5px solid var(--tf-surface)" }} />
                    </span>
                    <span className="flex-1 text-left truncate">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </aside>

      {/* Middle thread */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between gap-3 px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--tf-panel-border)" }}>
          <div>
            <h2 className="text-[17px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              # {team.name}
            </h2>
            <p className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
              {members.length} member{members.length === 1 ? "" : "s"} · {messages.length} message{messages.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={buildDigest}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-medium transition-colors hover:bg-white/5"
            style={{ border: "1px solid color-mix(in srgb, var(--tf-teal) 40%, var(--tf-panel-border))", color: "var(--tf-teal)" }}
          >
            <Sparkles size={13} aria-hidden="true" /> Catch me up
          </button>
        </header>

        {digest && (
          <div className="mx-6 mt-3 rounded-xl p-3 flex items-start gap-3" style={{ background: "var(--tf-fill-04)", border: "1px solid color-mix(in srgb, var(--tf-teal) 30%, var(--tf-panel-border))" }}>
            <Sparkles size={14} color="var(--tf-teal)" className="mt-0.5 shrink-0" />
            <p className="text-[12.5px] leading-snug flex-1" style={{ color: "var(--tf-ink-soft)" }}>{digest}</p>
            <button onClick={() => setDigest(null)} aria-label="Dismiss digest" className="shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
              <X size={13} />
            </button>
          </div>
        )}

        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto tf-scroll px-6 py-4 flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col gap-2.5 flex-1" role="status" aria-label="Loading messages">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <div className="w-8 h-8 rounded-full animate-pulse shrink-0" style={{ background: "var(--tf-fill-08)" }} />
                  <div className="flex-1">
                    <div className="h-3 w-24 rounded animate-pulse mb-1.5" style={{ background: "var(--tf-fill-08)" }} />
                    <div className="h-9 rounded-xl animate-pulse" style={{ background: "var(--tf-fill-04)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : error && messages.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={22} />}
              message={error}
              action={<Button variant="secondary" size="sm" onClick={() => void load(false)}>Retry</Button>}
            />
          ) : filteredMessages.length === 0 ? (
            <EmptyState icon={<MessageSquare size={22} />} message={search || filterMember ? "No messages match." : "No messages yet — say hello and plan the week out loud."} />
          ) : (
            grouped.map((g) => (
              <div key={g.label} className="flex flex-col gap-4">
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px" style={{ background: "var(--tf-panel-border)" }} />
                  <span className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>{g.label}</span>
                  <div className="flex-1 h-px" style={{ background: "var(--tf-panel-border)" }} />
                </div>
                {g.items.map((m) => {
                  const mine = user !== null && m.user?.id === user.id;
                  return (
                    <div key={m.id} className="flex gap-3 items-start group">
                      <Avatar initials={initialsOf(m.user?.name)} color={colorFor(m.user?.id ?? null, m.user?.name ?? "")} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-semibold" style={{ color: "var(--tf-ink)" }}>
                            {mine ? "You" : m.user?.name ?? "Former member"}
                          </span>
                          {m.created_at && (
                            <span className="text-[11px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                              {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          )}
                          {canDelete(m) && (
                            <button
                              onClick={() => void remove(m.id)}
                              aria-label="Delete message"
                              className="ml-auto w-6 h-6 rounded-md hidden group-hover:flex items-center justify-center shrink-0 transition-colors hover:bg-white/5"
                              style={{ color: "var(--tf-ink-muted)" }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div className="mt-1 text-[13.5px] leading-snug whitespace-pre-wrap break-words" style={{ color: "var(--tf-ink-soft)" }}>
                          {m.body}
                        </div>
                        {/* Task chip if a linked task title appears */}
                        {linkedTasks.filter((t) => m.body.toLowerCase().includes(t.title.toLowerCase())).map((t) => (
                          <div key={t.id} className="mt-2 flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ border: "1px solid var(--tf-panel-border)", background: "var(--tf-fill-03)" }}>
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-medium truncate" style={{ color: "var(--tf-ink)" }}>{t.title}</div>
                              <div className="text-[11px]" style={{ color: "var(--tf-ink-muted)" }}>Due {t.due} · {t.assignee}</div>
                            </div>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--tf-primary) 12%, transparent)", color: "var(--tf-primary)" }}>
                              {t.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {error && messages.length > 0 && (
          <p className="text-[11px] mt-2 shrink-0 px-6" style={{ color: "var(--tf-danger-text)" }}>{error}</p>
        )}

        <form onSubmit={(e) => void send(e)} className="flex gap-2 px-6 py-4 border-t shrink-0" style={{ borderColor: "var(--tf-panel-border)" }}>
          <div className="relative flex-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message #${team.name}…`}
              aria-label="Write a chat message"
              maxLength={2000}
              className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none"
              style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button type="button" onClick={() => setMentionOpen((o) => !o)} aria-label="Mention teammate" className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: "var(--tf-ink-muted)" }}>
                <AtSign size={14} />
              </button>
            </div>
            {mentionOpen && (
              <div className="absolute bottom-full right-2 mb-2 rounded-xl py-1 w-48 overflow-hidden" style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-panel-border)", boxShadow: "0 12px 28px rgba(0,0,0,0.4)" }}>
                {members.map((m) => (
                  <button
                    key={m.initials}
                    onClick={() => { setDraft((d) => d + `@${m.name.split(" ")[0]} `); setMentionOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-white/5"
                    style={{ color: "var(--tf-ink)" }}
                  >
                    <Avatar initials={m.initials} color={m.color} size={18} />
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="h-10 px-4 rounded-xl flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 transition-opacity hover:opacity-90 font-medium text-[12px]"
            style={{ background: "var(--tf-primary)", color: "white" }}
          >
            <Send size={14} /> Send
          </button>
        </form>
      </section>

      {/* Right rail */}
      <aside className="w-[300px] shrink-0 flex flex-col border-l overflow-y-auto tf-scroll" style={{ borderColor: "var(--tf-panel-border)", background: "var(--tf-surface)" }}>
        <section className="p-4 border-b" style={{ borderColor: "var(--tf-panel-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>Members · {members.length}</h3>
          </div>
          <div className="flex flex-col gap-2.5">
            {members.map((m) => (
              <div key={m.initials} className="flex items-center gap-2.5">
                <span className="relative shrink-0">
                  <Avatar initials={m.initials} color={m.color} size={26} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: m.status === "online" ? "var(--tf-success)" : m.status === "away" ? "var(--tf-warning)" : "var(--tf-ink-muted)", border: "1.5px solid var(--tf-surface)" }} />
                </span>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium truncate" style={{ color: "var(--tf-ink)" }}>{m.name}</div>
                  <div className="text-[11px]" style={{ color: "var(--tf-ink-muted)" }}>{m.jobTitle ?? "Team member"}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="p-4">
          <h3 className="text-[14px] font-semibold font-display mb-3" style={{ color: "var(--tf-ink)" }}>Linked tasks</h3>
          {linkedTasks.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>Tasks mentioned in this chat will appear here.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {linkedTasks.map((t) => (
                <div key={t.id} className="rounded-xl p-3" style={{ border: "1px solid var(--tf-panel-border)", background: "var(--tf-fill-03)" }}>
                  <div className="text-[12.5px] font-medium" style={{ color: "var(--tf-ink)" }}>{t.title}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>Due {t.due} · {t.assignee}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
