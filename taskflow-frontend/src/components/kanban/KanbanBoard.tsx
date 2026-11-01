import { useState, useCallback, memo } from "react";
import { Plus, MoreVertical, Sparkles, Edit3, Trash2, ArrowRightCircle, Inbox, CalendarDays, ListChecks } from "lucide-react";
import { Avatar, ConfirmDialog } from "../ui/Primitives";
import { DropdownMenu } from "../ui/DropdownMenu";
import { COLUMNS, PRIORITY_HEX, PRIORITY_TEXT } from "../../data/mockData";
import { useTeamMembers } from "../../context/TeamContext";
import type { Priority, Task, TaskColumn } from "../../types";

/** Custom drag type so foreign drags (text/files) can't land on the board. */
const TASK_DRAG_TYPE = "text/taskflow-task";

/** Dot + label pill, matching the priority chips in the reference board. */
function PriorityChip({ priority }: { priority: Priority }) {
  const hex = PRIORITY_HEX[priority];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        background: `color-mix(in srgb, ${hex} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${hex} 30%, transparent)`,
        color: PRIORITY_TEXT[priority],
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: hex }} aria-hidden="true" />
      {priority}
    </span>
  );
}

const KanbanCard = memo(function KanbanCard({
  task,
  isDragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onMove,
  onDelete,
}: {
  task: Task;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onOpen: (task: Task) => void;
  onMove: (id: string, column: TaskColumn) => void;
  onDelete: (id: string) => void;
}) {
  const members = useTeamMembers();
  const person = members.find((p) => p.initials === task.assignee);
  const otherColumns = COLUMNS.filter((c) => c !== task.column);

  return (
    <div
      draggable
      onDragStart={(e) => {
        // Carry the id in the drag payload instead of a module-level global:
        // state shared across instances broke when two boards existed (HMR,
        // tests) and never worked in Firefox, which requires setData().
        e.dataTransfer.setData(TASK_DRAG_TYPE, task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); // Space would also scroll the column
          onOpen(task);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${task.title}`}
      className="group rounded-xl p-3 cursor-pointer transition-colors hover:border-[var(--tf-fill-12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tf-teal)]"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-panel-border)",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold leading-snug line-clamp-2" style={{ color: "var(--tf-ink)" }}>
            {task.title}
          </div>
          {task.description && (
            <p className="text-[11.5px] leading-snug mt-1 line-clamp-2" style={{ color: "var(--tf-ink-muted)" }}>
              {task.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <DropdownMenu
              trigger={
                <button
                  aria-label="Task actions"
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-white/5"
                  style={{ color: "var(--tf-ink-muted)" }}
                >
                  <MoreVertical size={14} />
                </button>
              }
              groups={[
                { items: [{ label: "Edit", icon: <Edit3 size={13} />, onSelect: () => onOpen(task) }] },
                {
                  label: "Move to",
                  items: otherColumns.map((c) => ({ label: c, icon: <ArrowRightCircle size={13} />, onSelect: () => onMove(task.id, c) })),
                },
                { items: [{ label: "Delete", icon: <Trash2 size={13} />, onSelect: () => onDelete(task.id), danger: true }] },
              ]}
            />
          </div>
          {person && <Avatar initials={person.initials} color={person.color} size={24} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--tf-ink-muted)" }}>
        <span className="flex items-center gap-1">
          <CalendarDays size={11} aria-hidden="true" />
          {task.due}
        </span>
        {task.checklist && (
          <span className="flex items-center gap-1" title={`Checklist ${task.checklist.done} of ${task.checklist.total}`}>
            <ListChecks size={11} aria-hidden="true" />
            {task.checklist.done}/{task.checklist.total}
          </span>
        )}
        {task.atRisk && (
          <span className="flex items-center gap-1" style={{ color: "var(--tf-danger-text)" }} title="AI-flagged as at risk">
            <Sparkles size={11} aria-hidden="true" />
            At risk
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <PriorityChip priority={task.priority} />
        {task.project && (
          <span
            className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: "var(--tf-fill-06)", color: "var(--tf-ink-soft)" }}
          >
            {task.project}
          </span>
        )}
      </div>
    </div>
  );
});

export const KanbanBoard = memo(function KanbanBoard({
  tasks,
  columns = COLUMNS,
  onMove,
  onAddTask,
  onOpenTask,
  onDeleteTask,
}: {
  tasks: Task[];
  /** Which columns to render — defaults to the full board. */
  columns?: TaskColumn[];
  onMove: (id: string, column: TaskColumn) => void;
  onAddTask: (column: TaskColumn) => void;
  onOpenTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}) {
  const [dragOverCol, setDragOverCol] = useState<TaskColumn | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  // One confirm for the whole board instead of a hidden Modal tree per card.
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => setActiveDragId(id), []);
  const handleDragEnd = useCallback(() => setActiveDragId(null), []);
  const handleOpen = useCallback((task: Task) => onOpenTask(task), [onOpenTask]);
  const handleMove = useCallback((id: string, col: TaskColumn) => onMove(id, col), [onMove]);
  const handleDeleteRequest = useCallback((id: string) => setDeleteId(id), []);

  function handleDrop(col: TaskColumn, taskId: string) {
    setDragOverCol(null);
    if (taskId) onMove(taskId, col);
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 tf-scroll items-stretch h-[calc(100dvh-300px)] min-h-[420px]">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.column === col);

          return (
            <div
              key={col}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverCol(col);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col, e.dataTransfer.getData(TASK_DRAG_TYPE));
              }}
              className="w-[268px] shrink-0 rounded-xl transition-colors flex flex-col h-full"
              style={{
                background:
                  dragOverCol === col ? "color-mix(in srgb, var(--tf-primary) 8%, var(--tf-fill-02))" : "var(--tf-fill-02)",
                border: `1px solid ${dragOverCol === col ? "color-mix(in srgb, var(--tf-primary) 40%, transparent)" : "var(--tf-panel-border)"}`,
              }}
            >
              <div className="flex items-center gap-2 px-3.5 py-3">
                <span className="text-[13.5px] font-semibold" style={{ color: "var(--tf-ink)" }}>
                  {col}
                </span>
                <span
                  className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-md leading-none"
                  style={{ background: "var(--tf-fill-08)", color: "var(--tf-ink-muted)" }}
                >
                  {colTasks.length}
                </span>
              </div>

              <div
                className="flex flex-col gap-2 px-2.5 pb-2.5 flex-1 overflow-y-auto tf-scroll"
                style={{ contentVisibility: "auto", containIntrinsicSize: "auto 400px" }}
              >
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 py-8" style={{ color: "var(--tf-ink-muted)" }}>
                    <Inbox size={18} aria-hidden="true" />
                    <p className="text-[12px]">No tasks yet</p>
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <KanbanCard
                      key={t.id}
                      task={t}
                      isDragging={activeDragId === t.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onOpen={handleOpen}
                      onMove={handleMove}
                      onDelete={handleDeleteRequest}
                    />
                  ))
                )}

                <button
                  onClick={() => onAddTask(col)}
                  className="w-full mt-auto flex items-center justify-center gap-1.5 text-[12px] py-2 rounded-xl border border-dashed transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
                  aria-label={`Add task to ${col}`}
                >
                  <Plus size={13} aria-hidden="true" /> Add task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete task?"
        message={
          deleteId
            ? `"${tasks.find((t) => t.id === deleteId)?.title ?? "Task"}" will be removed from the board. You'll get a short window to undo this from the notification.`
            : ""
        }
        onConfirm={() => {
          if (deleteId) onDeleteTask(deleteId);
          setDeleteId(null);
        }}
      />
    </>
  );
});
