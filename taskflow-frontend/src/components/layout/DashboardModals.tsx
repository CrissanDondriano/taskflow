import { lazy, Suspense, useEffect } from "react";
import { useUIStore } from "../../stores/uiStore";
import { NewTaskModal } from "../dashboard/NewTaskModal";
import { ShortcutHelp } from "../command-palette/ShortcutHelp";
import { MobileSidebar } from "./Sidebar";
import { ConfirmDialog } from "../ui/Primitives";
import type { Task } from "../../types";

// Lazy shell overlays: kept out of the initial dashboard chunk. They are
// preloaded during idle (see below) and on trigger hover, so opening them
// never waits on the network. NewTaskModal stays eager — it's the most
// common action and must open instantly.
const CommandPalette = lazy(() =>
  import("../command-palette/CommandPalette").then((m) => ({ default: m.CommandPalette }))
);
const DailyBriefingModal = lazy(() =>
  import("../ai/DailyBriefingModal").then((m) => ({ default: m.DailyBriefingModal }))
);

function preloadShellOverlays() {
  void import("../command-palette/CommandPalette");
  void import("../ai/DailyBriefingModal");
}

/** Call from trigger hover/focus so the chunk is warm before the click. */
export function preloadOverlaysOnDemand() {
  preloadShellOverlays();
}

/**
 * All dashboard overlays in one place, driven by the UI store. This component
 * subscribes to activeModal; the shell (DashboardLayout) does not, so opening
 * an overlay re-renders only the overlay — never the sidebar, topbar, or the
 * page underneath.
 */
export function DashboardModals({ addTask, logout }: { addTask: (task: Task) => void; logout: () => void }) {
  const activeModal = useUIStore((s) => s.activeModal);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);

  // Warm the lazy overlay chunks while the browser is idle — by the time the
  // user hits Cmd+K or the briefing button, the code is already local.
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(preloadShellOverlays);
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(preloadShellOverlays, 1500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <NewTaskModal open={activeModal === "newTask"} onClose={closeModal} onCreate={addTask} defaultColumn="Backlog" />
      <Suspense fallback={null}>
        <CommandPalette
          open={activeModal === "palette"}
          onClose={closeModal}
          onNewTask={() => openModal("newTask")}
          onOpenBriefing={() => openModal("briefing")}
          onRequestLogout={() => openModal("logout")}
          onShowShortcuts={() => openModal("shortcuts")}
        />
      </Suspense>
      <ShortcutHelp open={activeModal === "shortcuts"} onClose={closeModal} />
      <Suspense fallback={null}>
        <DailyBriefingModal open={activeModal === "briefing"} onClose={closeModal} />
      </Suspense>
      <ConfirmDialog
        open={activeModal === "logout"}
        onClose={closeModal}
        title="Log out?"
        message="You'll need to sign in again to access your workspace."
        confirmLabel="Log out"
        onConfirm={logout}
      />
      <MobileSidebar open={activeModal === "sidebar"} onClose={closeModal} onRequestLogout={() => openModal("logout")} />
    </>
  );
}
