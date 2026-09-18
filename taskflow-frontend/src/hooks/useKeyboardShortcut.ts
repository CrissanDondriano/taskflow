import { useEffect } from "react";

interface ShortcutOptions {
  /** Require Cmd (Mac) or Ctrl (Windows/Linux) to be held. */
  meta?: boolean;
  /** Prevent the browser's default behavior for this combo (e.g. Ctrl+K opening browser search on some setups). */
  preventDefault?: boolean;
  /** Skip firing while the user is typing in an input/textarea, unless explicitly allowed. */
  allowInInputs?: boolean;
}

/**
 * Registers a global keyboard shortcut for as long as the component using
 * it is mounted. Used for the command palette (Cmd/Ctrl+K) but written
 * generically so future shortcuts (e.g. "g d" to go to dashboard) can reuse it.
 */
export function useKeyboardShortcut(key: string, callback: () => void, options: ShortcutOptions = {}) {
  const { meta = false, preventDefault = true, allowInInputs = false } = options;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isTyping = targetTag === "INPUT" || targetTag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      if (isTyping && !allowInInputs) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (meta && !(e.metaKey || e.ctrlKey)) return;
      if (!meta && (e.metaKey || e.ctrlKey)) return;

      if (preventDefault) e.preventDefault();
      callback();
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [key, callback, meta, preventDefault, allowInInputs]);
}
