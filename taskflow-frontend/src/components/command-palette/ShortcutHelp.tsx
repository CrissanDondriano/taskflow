import { Modal } from "../ui/Primitives";

interface ShortcutRow {
  keys: string[];
  label: string;
}

const GROUPS: { title: string; rows: ShortcutRow[] }[] = [
  {
    title: "Anywhere in the app",
    rows: [
      { keys: ["⌘", "K"], label: "Open the command palette (Ctrl on Windows/Linux)" },
      { keys: ["?"], label: "Show or hide this shortcut list" },
      { keys: ["Esc"], label: "Close dialogs, menus, and the palette" },
    ],
  },
  {
    title: "Command palette",
    rows: [
      { keys: ["↑", "↓"], label: "Move between results" },
      { keys: ["Enter"], label: "Run the highlighted command" },
    ],
  },
  {
    title: "Calendar page",
    rows: [
      { keys: ["1"], label: "Day view" },
      { keys: ["2"], label: "Week view" },
      { keys: ["3"], label: "Month view" },
      { keys: ["4"], label: "Agenda view" },
      { keys: ["T"], label: "Jump to today" },
      { keys: ["←"], label: "Previous day" },
      { keys: ["→"], label: "Next day" },
    ],
  },
];

/** Keyboard shortcut reference, opened with "?" or from the command palette footer. */
export function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <div className="flex flex-col gap-4">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--tf-ink-muted)" }}>
              {group.title}
            </div>
            <ul className="flex flex-col gap-1.5">
              {group.rows.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-3 text-[13px]" style={{ color: "var(--tf-ink)" }}>
                  <span>{row.label}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {row.keys.map((k) => (
                      <kbd
                        key={k}
                        className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                        style={{ border: "1px solid var(--tf-panel-border)", background: "var(--tf-fill-04)", color: "var(--tf-ink-muted)" }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
