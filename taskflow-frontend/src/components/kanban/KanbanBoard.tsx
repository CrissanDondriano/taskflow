import { useState, useCallback, memo } from "react";
import { Plus, MoreVertical, Sparkles, Edit3, Trash2, ArrowRightCircle, Inbox } from "lucide-react";
import { Avatar, PriorityBadge, ConfirmDialog } from "../ui/Primitives";
import { Badge } from "../ui/Badge";
import { DropdownMenu } from "../ui/DropdownMenu";
import { COLUMNS, PRIORITY_HEX } from "../../data/mockData";
import { useTeamMembers } from "../../context/TeamContext";
import type { Task, TaskColumn } from "../../types";

/** Custom drag type so foreign drags (text/files) can't land on the board. */
const TASK_DRAG_TYPE = "text/taskflow-task";

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
  const color = PRIORITY_HEX[task.priority];
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
      className="group rounded-xl p-3 cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-panel-border)",
        borderLeft: `3px solid ${color}`,
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? "none" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono truncate" style={{ color: "var(--tf-ink-muted)" }}>
            {task.project}
          </span>
          {task.atRisk && (
            <span title="AI-flagged as at risk" className="flex items-center shrink-0" style={{ color: "var(--tf-danger)" }}>
              <Sparkles size={11} />
            </span>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
          <DropdownMenu
            trigger={
              <button aria-label="Task actions" className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: "var(--tf-ink-muted)" }}>
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
      </div>

      <div className="text-sm font-medium mb-2 leading-snug" style={{ color: "var(--tf-ink)" }}>
        {task.title}
      </div>

      {task.description && (
        <p className="text-xs leading-snug mb-2 line-clamp-2" style={{ color: "var(--tf-ink-muted)" }}>
          {task.description}
        </p>
      )}

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((l) => (
            <Badge key={l} color="var(--tf-ink-muted)">
              {l}
            </Badge>
          ))}
        </div>
      )}

      {task.checklist && (
        <div className="mb-2">
          <div className="flex justify-between text-[10px] font-mono mb-1" style={{ color: "var(--tf-ink-muted)" }}>
            <span>Checklist</span>
            <span>
              {task.checklist.done}/{task.checklist.total}
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--tf-fill-08)" }}>
            <div className="h-full rounded-full" style={{ width: `${task.checklist.total > 0 ? (task.checklist.done / task.checklist.total) * 100 : 0}%`, background: "var(--tf-teal)" }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
            {task.due}
          </span>
          {person?.jobTitle && (
            <span className="text-[10px] truncate" style={{ color: "var(--tf-ink-muted)" }} title={person.jobTitle}>
              {person.jobTitle}
            </span>
          )}
          {person && <Avatar initials={person.initials} color={person.color} size={22} />}
        </div>
      </div>
    </div>
  );
});

export const KanbanBoard = memo(function KanbanBoard({
  tasks,
  onMove,
  onAddTask,
  onOpenTask,
  onDeleteTask,
}: {
  tasks: Task[];
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
      <div className="flex gap-4 overflow-x-auto pb-2 tf-scroll">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.column === col);
          const criticalCount = colTasks.filter((t) => t.priority === "Critical").length;

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
              className="w-72 shrink-0 rounded-2xl transition-colors flex flex-col max-h-[calc(100vh-320px)]"
              style={{
                background: dragOverCol === col ? "rgba(37,99,235,0.08)" : "var(--tf-fill-02)",
                border: `1px solid ${dragOverCol === col ? "rgba(37,99,235,0.4)" : "var(--tf-panel-border)"}`,
              }}
            >
              <div
                className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 rounded-t-2xl backdrop-blur-sm"
                style={{ background: "var(--tf-sticky)" }}
              >
                <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--tf-ink)" }}>
                  {col}
                </span>
                <div className="flex items-center gap-1.5">
                  {criticalCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "var(--tf-danger-text)" }}>
                      {criticalCount} critical
                    </span>
                  )}
                  <span className="text-[10px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                    {colTasks.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 px-3 pb-2 flex-1 overflow-y-auto tf-scroll" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 400px" }}>
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 py-8" style={{ color: "var(--tf-ink-muted)" }}>
                    <Inbox size={18} />
                    <p className="text-xs">No tasks yet</p>
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
                  className="w-full mt-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "var(--tf-ink-muted)" }}
                  aria-label={`Add task to ${col}`}
                >
                  <Plus size={13} /> Add task
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
        message={deleteId ? `"${tasks.find((t) => t.id === deleteId)?.title ?? "Task"}" will be removed from the board. You'll get a short window to undo this from the notification.` : ""}
        onConfirm={() => {
          if (deleteId) onDeleteTask(deleteId);
          setDeleteId(null);
        }}
      />
    </>
  );
});
