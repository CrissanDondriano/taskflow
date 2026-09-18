import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface DropdownMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

export interface DropdownMenuGroup {
  label?: string;
  items: DropdownMenuItem[];
}

/**
 * Generic, keyboard-operable context menu, rendered through a portal into
 * document.body and positioned from the trigger's real screen coordinates.
 * Needed because this menu is used inside Kanban cards, which have their
 * own hover transforms and sit inside scrolling columns — nesting the
 * dropdown in that DOM subtree caused it to appear clipped, behind other
 * cards, or oddly positioned depending on scroll state.
 */
export function DropdownMenu({ trigger, groups, align = "end" }: { trigger: ReactNode; groups: DropdownMenuGroup[]; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const PANEL_WIDTH = 176; // w-44

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({
        top: rect.bottom + 4,
        left: align === "end" ? rect.right - PANEL_WIDTH : rect.left,
      });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, []);

  return (
    <>
      <span ref={triggerRef} onClick={toggleOpen}>
        {trigger}
      </span>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed rounded-xl overflow-hidden py-1"
            style={{
              top: coords.top,
              left: coords.left,
              width: PANEL_WIDTH,
              zIndex: 1000,
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-panel-border)",
              boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {groups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? "pt-1 mt-1" : ""} style={gi > 0 ? { borderTop: "1px solid var(--tf-panel-border)" } : {}}>
                {group.label && (
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.onSelect();
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/5"
                    style={{ color: item.danger ? "var(--tf-danger)" : "var(--tf-ink)" }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
