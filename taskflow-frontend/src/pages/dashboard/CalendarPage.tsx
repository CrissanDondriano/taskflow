import { useMemo, useState } from "react";
import { CalendarViewTabs, type CalendarViewMode } from "../../components/calendar/CalendarViewTabs";
import { MonthView } from "../../components/calendar/MonthView";
import { TimeGrid } from "../../components/calendar/TimeGrid";
import { AgendaView } from "../../components/calendar/AgendaView";
import { AiSchedulingPanel } from "../../components/calendar/AiSchedulingPanel";
import { MeetingDetailModal } from "../../components/calendar/MeetingDetailModal";
import { useTasks } from "../../context/TasksContext";
import { useMeetings } from "../../context/MeetingsContext";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { detectConflicts, getWeekDates, parseDueToAnchorDay, dateForDay, TODAY_DAY } from "../../lib/calendar";
import type { Meeting, DeadlineItem } from "../../types";

export function CalendarPage() {
  const { tasks } = useTasks();
  const { meetings, moveMeeting, resizeMeeting, updateMeeting, deleteMeeting } = useMeetings();
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

  function selectMeeting(m: Meeting) {
    setSelectedMeetingId(m.id);
    setOpenMeeting(m);
  }

  // Keyboard shortcuts: 1-4 switch views, arrows move the selected day, T jumps to today.
  useKeyboardShortcut("1", () => setView("day"));
  useKeyboardShortcut("2", () => setView("week"));
  useKeyboardShortcut("3", () => setView("month"));
  useKeyboardShortcut("4", () => setView("agenda"));
  useKeyboardShortcut("t", () => setSelectedDay(TODAY_DAY));
  useKeyboardShortcut("ArrowLeft", () => setSelectedDay((d) => Math.max(1, d - 1)));
  useKeyboardShortcut("ArrowRight", () => setSelectedDay((d) => Math.min(31, d + 1)));

  const weekDates = getWeekDates(selectedDay);
  const dayDates = [dateForDay(selectedDay)];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CalendarViewTabs view={view} onChange={setView} />
        <p className="text-[10px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
          Shortcuts: 1–4 switch views · ←/→ change day · T jumps to today
        </p>
      </div>

      <MeetingDetailModal meeting={openMeeting} onClose={() => setOpenMeeting(null)} onSave={updateMeeting} onDelete={deleteMeeting} />

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
          <div className="lg:col-span-3 rounded-2xl p-4" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
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
          </div>
          <div className="lg:col-span-1">
            <AiSchedulingPanel dayMeetings={selectedDayMeetings} conflictIds={conflictIds} day={selectedDay} />
          </div>
        </div>
      )}

      {view === "agenda" && <AgendaView meetings={meetings} deadlines={deadlines} conflictIds={conflictIds} />}
    </div>
  );
}
