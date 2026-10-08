import { useEffect, useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { Avatar } from "../ui/Primitives";
import { api, ApiError } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import { initialsOf, timeAgo } from "../../lib/format";

interface ApiComment {
  id: number;
  body: string;
  created_at: string | null;
  user_id: number | null;
  user: { id: number; name: string; avatar_url?: string | null } | null;
}

/**
 * Discussion thread for one task. Loads on open (never blocks the modal —
 * the detail form renders first), posts optimistically-ish (clears on
 * success, toasts on failure), and lets authors (or managers) delete.
 */
export function TaskComments({ taskId }: { taskId: string }) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data: ApiComment[] }>(`/tasks/${taskId}/comments`)
      .then((res) => {
        if (!cancelled) {
          setComments(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't load comments.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await api.post<{ data: ApiComment }>(`/tasks/${taskId}/comments`, { body });
      setComments((prev) => [...prev, res.data]);
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't post that comment.");
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: number) {
    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.delete(`/tasks/${taskId}/comments/${id}`);
    } catch (err) {
      setComments(previous);
      setError(err instanceof ApiError ? err.message : "Couldn't delete that comment.");
    }
  }

  const canDelete = (c: ApiComment) =>
    user !== null && (c.user_id === user.id || user.role === "admin" || user.role === "manager");

  return (
    <div>
      <div className="text-[11px] font-mono mb-2 flex items-center gap-1.5" style={{ color: "var(--tf-ink-muted)" }}>
        <MessageSquare size={11} aria-hidden="true" />
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2" aria-label="Loading comments">
          {[0, 1].map((i) => (
            <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: "var(--tf-fill-04)" }} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs rounded-xl px-3 py-2.5" style={{ background: "var(--tf-fill-03)", color: "var(--tf-ink-muted)" }}>
          No comments yet — ask a question or leave context for whoever picks this up.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 max-h-56 overflow-y-auto tf-scroll pr-0.5">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-xl px-3 py-2"
              style={{ background: "var(--tf-fill-03)", border: "1px solid var(--tf-panel-border)" }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar initials={initialsOf(c.user?.name)} color="#2563EB" size={20} />
                  <span className="text-xs font-medium truncate" style={{ color: "var(--tf-ink)" }}>
                    {c.user?.name ?? "Former member"}
                  </span>
                  {c.created_at && (
                    <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
                      {timeAgo(c.created_at)}
                    </span>
                  )}
                </div>
                {canDelete(c) && (
                  <button
                    onClick={() => void remove(c.id)}
                    aria-label="Delete comment"
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors hover:bg-white/5"
                    style={{ color: "var(--tf-ink-muted)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="text-[13px] leading-snug whitespace-pre-wrap break-words" style={{ color: "var(--tf-ink-soft)" }}>
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-[11px] mt-1.5" style={{ color: "var(--tf-danger)" }}>
          {error}
        </p>
      )}

      <form onSubmit={(e) => void post(e)} className="flex gap-2 mt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment…"
          aria-label="Write a comment"
          maxLength={2000}
          className="flex-1 text-[13px] px-3 py-2 rounded-xl outline-none min-w-0"
          style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || posting}
          aria-label="Post comment"
          className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: "var(--tf-primary)" }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
