/**
 * Shared formatting helpers. These were previously copy-pasted across the
 * codebase (initialsOf existed in five files, timeAgo in three) — one
 * implementation keeps the rules consistent everywhere.
 */

/**
 * "Ada Lovelace" → "AL". Missing or unparseable input → "?" so an avatar
 * placeholder never renders as an empty circle.
 */
export function initialsOf(name?: string): string {
  if (!name) return "?";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

/** "just now" / "4m ago" / "3h ago" / "2d ago" for a recent timestamp. */
export function timeAgo(date: string | Date): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
