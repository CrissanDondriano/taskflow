import { useState } from "react";
import { Plus, MoreVertical, Sparkles, Edit3, Trash2, ArrowRightCircle, Inbox } from "lucide-react";
import { Avatar, PriorityBadge } from "../ui/Primitives";
import { Badge } from "../ui/Badge";
import { DropdownMenu } from "../ui/DropdownMenu";
import { COLUMNS, PRIORITY_HEX } from "../../data/mockData";
import { useTeam } from "../../context/TeamContext";
import type { Task, TaskColumn } from "../../types";

let draggingId: string | null = null;

function KanbanCard({
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
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onMove: (column: TaskColumn) => void;
  onDelete: () => void;
}) {
  const { members } = useTeam();
  const person = members.find((p) => p.initials === task.assignee);
  const color = PRIORITY_HEX[task.priority];
  const otherColumns = COLUMNS.filter((c) => c !== task.column);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
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
              <button aria-label="Task actions" className="w-6 h-6 rounded-md flex items-center justify-center" style={{ color: "var(--tf-ink-muted)" }}>
                <MoreVertical size={14} />
              </button>
            }
            groups={[
              { items: [{ label: "Edit", icon: <Edit3 size={13} />, onSelect: onOpen }] },
              {
                label: "Move to",
                items: otherColumns.map((c) => ({ label: c, icon: <ArrowRightCircle size={13} />, onSelect: () => onMove(c) })),
              },
              { items: [{ label: "Delete", icon: <Trash2 size={13} />, onSelect: onDelete, danger: true }] },
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
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full" style={{ width: `${(task.checklist.done / task.checklist.total) * 100}%`, background: "var(--tf-teal)" }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
            {task.due}
          </span>
          {person && <Avatar initials={person.initials} color={person.color} size={22} />}
        </div>
      </div>
    </div>
  );
}

export function KanbanBoard({
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

  function handleDrop(col: TaskColumn) {
    setDragOverCol(null);
    if (draggingId) onMove(draggingId, col);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 tf-scroll">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.column === col);
        const criticalCount = colTasks.filter((t) => t.priority === "Critical").length;

        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col);
            }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDrop(col)}
            className="w-72 shrink-0 rounded-2xl transition-colors flex flex-col max-h-[calc(100vh-320px)]"
            style={{
              background: dragOverCol === col ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${dragOverCol === col ? "rgba(37,99,235,0.4)" : "var(--tf-panel-border)"}`,
            }}
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 rounded-t-2xl backdrop-blur-sm"
              style={{ background: "rgba(5,7,12,0.85)" }}
            >
              <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--tf-ink)" }}>
                {col}
              </span>
              <div className="flex items-center gap-1.5">
                {criticalCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#FCA5A5" }}>
                    {criticalCount} critical
                  </span>
                )}
                <span className="text-[10px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                  {colTasks.length}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 px-3 pb-2 flex-1 overflow-y-auto tf-scroll">
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
                    onDragStart={() => {
                      draggingId = t.id;
                      setActiveDragId(t.id);
                    }}
                    onDragEnd={() => {
                      draggingId = null;
                      setActiveDragId(null);
                    }}
                    onOpen={() => onOpenTask(t)}
                    onMove={(column) => onMove(t.id, column)}
                    onDelete={() => onDeleteTask(t.id)}
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
  );
}
