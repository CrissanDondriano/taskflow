import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CalendarViewTabs, type CalendarViewMode } from "../../components/calendar/CalendarViewTabs";
import { MonthView } from "../../components/calendar/MonthView";
import { TimeGrid } from "../../components/calendar/TimeGrid";
import { AgendaView } from "../../components/calendar/AgendaView";
import { AiSchedulingPanel } from "../../components/calendar/AiSchedulingPanel";
import { MeetingDetailModal } from "../../components/calendar/MeetingDetailModal";
import { NewMeetingModal } from "../../components/calendar/NewMeetingModal";
import { useTasksData } from "../../context/TasksContext";
import { useMeetingsData, useMeetingsActions } from "../../context/MeetingsContext";
import { GlassPanel } from "../../components/ui/Primitives";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { useToast } from "../../context/ToastContext";
import {
  detectConflicts,
  getWeekDates,
  parseDueToAnchorDay,
  dateForDay,
  formatMonthLabel,
  TODAY_DAY,
  MIN_MONTH_OFFSET,
  MAX_MONTH_OFFSET,
} from "../../lib/calendar";
import type { Meeting, DeadlineItem } from "../../types";

export function CalendarPage() {
  const tasks = useTasksData();
  const meetings = useMeetingsData();
  const { moveMeeting, resizeMeeting, addMeeting, updateMeeting, deleteMeeting, undoDelete } = useMeetingsActions();
  const { toast } = useToast();
  const [view, setView] = useState<CalendarViewMode>("month");
  const [selectedDay, setSelectedDay] = useState(TODAY_DAY);
  const [monthOffset, setMonthOffset] = useState(0);
  const [openMeeting, setOpenMeeting] = useState<Meeting | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | undefined>(undefined);
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);

  // Task due dates become calendar deadlines automatically — real derived
  // data from TasksContext, not a separate hardcoded list. Create or
  // reassign a task's due date in Kanban and it shows up here too.
  const deadlines: DeadlineItem[] = useMemo(
    () =>
      tasks
        .map((t) => {
          const day = parseDueToAnchorDay(t.due);
          return day ? { id: t.id, title: t.title, day, priority: t.priority, project: t.project } : null;
        })
        .filter((d): d is DeadlineItem => d !== null),
    [tasks]
  );

  const meetingsByDay = useMemo(() => {
    const map: Record<number, Meeting[]> = {};
    meetings.forEach((m) => (map[m.day] ??= []).push(m));
    return map;
  }, [meetings]);

  const deadlinesByDay = useMemo(() => {
    const map: Record<number, DeadlineItem[]> = {};
    deadlines.forEach((d) => (map[d.day] ??= []).push(d));
    return map;
  }, [deadlines]);

  const conflictIds = useMemo(() => detectConflicts(meetings), [meetings]);
  const selectedDayMeetings = meetingsByDay[selectedDay] ?? [];

  // Stable callback: passed to TimeGrid/MonthView, so its identity must not
  // change on unrelated renders (e.g. opening the detail modal).
  const selectMeeting = useCallback((m: Meeting) => {
    setSelectedMeetingId(m.id);
    setOpenMeeting(m);
  }, []);

  // Keyboard shortcuts: 1-4 switch views, arrows move the selected day, T jumps to today.
  useKeyboardShortcut("1", () => setView("day"));
  useKeyboardShortcut("2", () => setView("week"));
  useKeyboardShortcut("3", () => setView("month"));
  useKeyboardShortcut("4", () => setView("agenda"));
  useKeyboardShortcut("t", () => setSelectedDay(TODAY_DAY));
  useKeyboardShortcut("ArrowLeft", () => setSelectedDay((d) => Math.max(1, d - 1)));
  useKeyboardShortcut("ArrowRight", () => setSelectedDay((d) => Math.min(31, d + 1)));

  // Memoized so TimeGrid receives stable day arrays across unrelated renders.
  const weekDates = useMemo(() => getWeekDates(selectedDay), [selectedDay]);
  const dayDates = useMemo(() => [dateForDay(selectedDay)], [selectedDay]);

  const handleDeleteMeeting = useCallback(
    (id: string) => {
      deleteMeeting(id);
      toast("Meeting deleted.", "info", { label: "Undo", run: undoDelete });
    },
    [deleteMeeting, toast, undoDelete]
  );

  const clampMonth = (o: number) => Math.max(MIN_MONTH_OFFSET, Math.min(MAX_MONTH_OFFSET, o));

  function step(dir: -1 | 1) {
    if (view === "month" || view === "agenda") {
      setMonthOffset((o) => clampMonth(o + dir));
      return;
    }
    const delta = view === "week" ? 7 : 1;
    setSelectedDay((d) => Math.max(1, Math.min(31, d + dir * delta)));
  }

  const label = useMemo(() => {
    if (view === "month" || view === "agenda") return formatMonthLabel(monthOffset);
    if (view === "day") {
      return dateForDay(selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    }
    const week = getWeekDates(selectedDay);
    const start = week[0];
    const end = week[6];
    return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }, [view, monthOffset, selectedDay]);

  return (
    <div className="flex flex-col gap-4">
      <MeetingDetailModal
        meeting={openMeeting}
        onClose={() => setOpenMeeting(null)}
        onSave={updateMeeting}
        onDelete={handleDeleteMeeting}
      />
      <NewMeetingModal
        open={newMeetingOpen}
        onClose={() => setNewMeetingOpen(false)}
        onCreate={addMeeting}
        defaultDay={selectedDay}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-stretch">
        <GlassPanel className="p-3 sm:p-4 min-w-0 flex flex-col min-h-[calc(100dvh-170px)]">
          {/* ---------- Toolbar ---------- */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => step(-1)}
                aria-label="Previous"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => step(1)}
                aria-label="Next"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
              >
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() => setNewMeetingOpen(true)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--tf-primary)", color: "#fff" }}
              >
                Add event <Plus size={13} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 min-w-[140px] text-center order-last sm:order-none w-full sm:w-auto">
              <span className="text-[15px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                {label}
              </span>
            </div>

            <CalendarViewTabs view={view} onChange={setView} />
          </div>

          {view === "month" && monthOffset !== 0 && (
            <div
              className="mb-3 px-3 py-2 rounded-lg text-[11.5px]"
              style={{ background: "var(--tf-fill-03)", color: "var(--tf-ink-muted)" }}
            >
              No tasks or meetings are dated outside July 2026 yet.{" "}
              <button onClick={() => setMonthOffset(0)} className="underline" style={{ color: "var(--tf-teal)" }}>
                Jump back to July
              </button>
            </div>
          )}

          {view === "month" && (
            <MonthView
              monthOffset={monthOffset}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              meetingsByDay={meetingsByDay}
              deadlinesByDay={deadlinesByDay}
              onSelectMeeting={selectMeeting}
            />
          )}

          {(view === "week" || view === "day") && (
            <TimeGrid
              days={view === "week" ? weekDates : dayDates}
              meetings={meetings}
              deadlines={deadlines}
              conflictIds={conflictIds}
              onMoveMeeting={moveMeeting}
              onResizeMeeting={resizeMeeting}
              onSelectMeeting={selectMeeting}
              selectedMeetingId={selectedMeetingId}
            />
          )}

          {view === "agenda" && <AgendaView meetings={meetings} deadlines={deadlines} conflictIds={conflictIds} />}
        </GlassPanel>

        <aside className="flex flex-col gap-4 min-w-0">
          <AiSchedulingPanel
            dayMeetings={selectedDayMeetings}
            conflictIds={conflictIds}
            day={selectedDay}
            onReschedule={(id, startHour) => moveMeeting(id, selectedDay, startHour)}
          />
          <p className="text-[11px] font-mono leading-relaxed px-1" style={{ color: "var(--tf-ink-muted)" }}>
            Shortcuts: 1–4 switch views · ←/→ change day · T jumps to today
          </p>
        </aside>
      </div>
    </div>
  );
}
