import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { GlassPanel, Avatar, EmptyState } from "../../components/ui/Primitives";
import { Button } from "../../components/ui/Button";
import { useTeamMembers } from "../../context/TeamContext";
import { useTeamStore } from "../../stores/teamStore";
import { useAuthStore } from "../../stores/authStore";
import { api, ApiError } from "../../lib/api";
import { initialsOf, timeAgo } from "../../lib/format";

interface ChatMessage {
  id: number;
  body: string;
  created_at: string | null;
  user: { id: number; name: string } | null;
}

const POLL_MS = 4000;

/**
 * Team chat: one shared room per team. Polls every few seconds (works with
 * or without a live Reverb server — the API also broadcasts new messages
 * for realtime setups), auto-scrolls on send, and keeps history to the
 * latest 100 server-side.
 */
export function TeamChatPage() {
  const team = useTeamStore((s) => s.team);
  const members = useTeamMembers();
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
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

  // Follow new arrivals only when the reader is already at the bottom —
  // never yank someone who's scrolled up to read history.
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

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <GlassPanel className="p-4 flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
            {team.name} chat
          </h2>
          <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
            {members.length} member{members.length === 1 ? "" : "s"} · newest at the bottom
          </p>
        </div>
      </GlassPanel>

      <GlassPanel className="flex-1 min-h-0 flex flex-col p-4">
        {loading ? (
          <div className="flex flex-col gap-2.5 flex-1" aria-label="Loading messages">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full animate-pulse shrink-0" style={{ background: "var(--tf-fill-08)" }} />
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
            action={
              <Button variant="secondary" size="sm" onClick={() => void load(false)}>
                Retry
              </Button>
            }
          />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={22} />}
            message="No messages yet — say hello and plan the week out loud."
          />
        ) : (
          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto tf-scroll flex flex-col gap-3 pr-0.5">
            {messages.map((m) => {
              const mine = user !== null && m.user?.id === user.id;
              return (
                <div key={m.id} className={`flex gap-2.5 items-start group ${mine ? "flex-row-reverse" : ""}`}>
                  <Avatar initials={initialsOf(m.user?.name)} color={colorFor(m.user?.id ?? null, m.user?.name ?? "")} size={28} />
                  <div className={`min-w-0 max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] font-medium truncate" style={{ color: "var(--tf-ink)" }}>
                        {mine ? "You" : m.user?.name ?? "Former member"}
                      </span>
                      {m.created_at && (
                        <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
                          {timeAgo(m.created_at)}
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-0.5 px-3 py-2 rounded-xl text-[13px] leading-snug whitespace-pre-wrap break-words"
                      style={
                        mine
                          ? { background: "var(--tf-primary)", color: "white" }
                          : { background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-soft)" }
                      }
                    >
                      {m.body}
                    </div>
                  </div>
                  {canDelete(m) && (
                    <button
                      onClick={() => void remove(m.id)}
                      aria-label="Delete message"
                      className="w-6 h-6 rounded-md hidden group-hover:flex items-center justify-center shrink-0 mt-5 transition-colors hover:bg-white/5"
                      style={{ color: "var(--tf-ink-muted)" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        {error && messages.length > 0 && (
          <p className="text-[11px] mt-2 shrink-0" style={{ color: "var(--tf-danger)" }}>
            {error}
          </p>
        )}

        <form onSubmit={(e) => void send(e)} className="flex gap-2 mt-3 shrink-0">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${team.name}…`}
            aria-label="Write a chat message"
            maxLength={2000}
            className="flex-1 text-sm px-3 py-2.5 rounded-xl outline-none min-w-0"
            style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: "var(--tf-primary)" }}
          >
            <Send size={15} />
          </button>
        </form>
      </GlassPanel>
    </div>
  );
}
