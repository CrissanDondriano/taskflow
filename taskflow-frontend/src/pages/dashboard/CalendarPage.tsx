import { useCallback, useMemo, useState } from "react";
import { CalendarViewTabs, type CalendarViewMode } from "../../components/calendar/CalendarViewTabs";
import { MonthView } from "../../components/calendar/MonthView";
import { TimeGrid } from "../../components/calendar/TimeGrid";
import { AgendaView } from "../../components/calendar/AgendaView";
import { AiSchedulingPanel } from "../../components/calendar/AiSchedulingPanel";
import { MeetingDetailModal } from "../../components/calendar/MeetingDetailModal";
import { useTasksData } from "../../context/TasksContext";
import { useMeetingsData, useMeetingsActions } from "../../context/MeetingsContext";
import { GlassPanel } from "../../components/ui/Primitives";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { useToast } from "../../context/ToastContext";
import { detectConflicts, getWeekDates, parseDueToAnchorDay, dateForDay, TODAY_DAY } from "../../lib/calendar";
import type { Meeting, DeadlineItem } from "../../types";

export function CalendarPage() {
  const tasks = useTasksData();
  const meetings = useMeetingsData();
  const { moveMeeting, resizeMeeting, updateMeeting, deleteMeeting, undoDelete } = useMeetingsActions();
  const { toast } = useToast();
  const [view, setView] = useState<CalendarViewMode>("week");
  const [selectedDay, setSelectedDay] = useState(TODAY_DAY);
  const [monthOffset, setMonthOffset] = useState(0);
  const [openMeeting, setOpenMeeting] = useState<Meeting | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | undefined>(undefined);

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

  // Stable callback: passed to TimeGrid, so its identity must not change on
  // unrelated renders (e.g. opening the detail modal) or the grid re-renders.
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CalendarViewTabs view={view} onChange={setView} />
        <p className="text-[10px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
          Shortcuts: 1–4 switch views · ←/→ change day · T jumps to today
        </p>
      </div>

      <MeetingDetailModal
        meeting={openMeeting}
        onClose={() => setOpenMeeting(null)}
        onSave={updateMeeting}
        onDelete={handleDeleteMeeting}
      />

      {view === "month" && (
        <MonthView
          monthOffset={monthOffset}
          onMonthOffsetChange={setMonthOffset}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          meetingsByDay={meetingsByDay}
          deadlinesByDay={deadlinesByDay}
        />
      )}

      {(view === "week" || view === "day") && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <GlassPanel className="lg:col-span-3 p-4">
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
          </GlassPanel>
          <div className="lg:col-span-1">
            <AiSchedulingPanel dayMeetings={selectedDayMeetings} conflictIds={conflictIds} day={selectedDay} />
          </div>
        </div>
      )}

      {view === "agenda" && <AgendaView meetings={meetings} deadlines={deadlines} conflictIds={conflictIds} />}
    </div>
  );
}
