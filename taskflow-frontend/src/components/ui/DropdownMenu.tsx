import { cloneElement, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
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
 *
 * Follows the WAI-ARIA menu-button pattern: the trigger gets
 * aria-haspopup/aria-expanded, the panel is role="menu" with menuitem
 * children, focus moves into the menu on open, Arrow/Home/End rove between
 * items, and Escape or a selection returns focus to the trigger.
 */
export function DropdownMenu({ trigger, groups, align = "end" }: { trigger: ReactNode; groups: DropdownMenuGroup[]; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const PANEL_WIDTH = 176; // w-44

  /** Closes the menu and puts focus back on whatever opened it. */
  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.querySelector<HTMLElement>("button, a, [tabindex]")?.focus();
    }
  }

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

  // Move focus into the menu as soon as it opens so keyboard users start
  // on the first item instead of being stranded on the trigger.
  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

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
      if (e.key === "Escape") close();
    }
    function onScrollOrResize() {
      close(false); // scrolled away from the trigger — no point refocusing it
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
  }, [open]);

  /** Roving focus: Arrow keys, Home/End, Tab leaves the menu. */
  function onPanelKeyDown(e: React.KeyboardEvent) {
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      // Don't let Tab jump through the portal to the end of <body>;
      // close and continue from the trigger instead.
      e.preventDefault();
      close();
    }
  }

  // Expose menu-button state on the trigger itself (typically a <button>).
  const renderedTrigger = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<Record<string, unknown>>, {
        "aria-haspopup": "menu",
        "aria-expanded": open,
      })
    : trigger;

  return (
    <>
      <span
        ref={triggerRef}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          // Enter/Space on the trigger must not also reach an ancestor card's
          // key handler (which would open the task underneath the menu).
          // Tab still bubbles so focus traps keep working.
          if (e.key === "Enter" || e.key === " ") e.stopPropagation();
        }}
      >
        {renderedTrigger}
      </span>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label="Actions"
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
            onKeyDown={onPanelKeyDown}
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
                    key={`${gi}-${item.label}`}
                    role="menuitem"
                    onClick={() => {
                      item.onSelect();
                      close();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/5 focus:bg-white/10 focus:outline-none"
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
