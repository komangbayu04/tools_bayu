"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  useTaskStore, useProjectStore,
  type TaskStatus, type Task,
} from "@/lib/store";
import { STATUS_META, DeadlineLabel } from "../shared";
import { TaskDetailDialog } from "../TaskDetailDialog";

type Filter = "all" | TaskStatus;
type ViewMode = "list" | "kanban";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

interface KanbanColumn {
  id: string;
  label: string;
  statusFilter?: TaskStatus;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "col-todo", label: "To Do", statusFilter: "todo" },
  { id: "col-inprog", label: "In Progress", statusFilter: "in_progress" },
  { id: "col-done", label: "Done", statusFilter: "done" },
  { id: "col-review", label: "Review", statusFilter: undefined },
];

export default function AllTasksPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const toggleDone = useTaskStore((s) => s.toggleDone);
  const setStatus = useTaskStore((s) => s.setStatus);
  const projects = useProjectStore((s) => s.projects);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Kanban state
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_COLUMNS);
  // customColumnMap: taskId → colId (for tasks in custom columns without a statusFilter)
  const [customColumnMap, setCustomColumnMap] = useState<Record<string, string>>({});
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColLabel, setEditingColLabel] = useState("");

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const projectColor = (id: string) => projects.find((p) => p.id === id)?.color ?? "#aaa";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => (filter === "all" ? true : t.status === filter))
      .filter((t) =>
        q
          ? t.title.toLowerCase().includes(q) ||
            (t.description ?? "").toLowerCase().includes(q) ||
            projectName(t.projectId).toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => a.createdAt - b.createdAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, projects, filter, search]);

  // Get tasks for a kanban column
  const tasksForColumn = (col: KanbanColumn): Task[] => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      // Match search
      if (q) {
        const matches =
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q) ||
          projectName(t.projectId).toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (col.statusFilter) {
        // Standard column: match by status, but not if task is in a custom column
        return t.status === col.statusFilter && customColumnMap[t.id] === undefined;
      } else {
        // Custom column: match by customColumnMap
        return customColumnMap[t.id] === col.id;
      }
    });
  };

  // dnd-kit sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const colId = over.id as string;
    const col = columns.find((c) => c.id === colId);
    if (!col) return;

    if (col.statusFilter) {
      // Standard column → set task status and remove from customColumnMap
      setStatus(taskId, col.statusFilter);
      setCustomColumnMap((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    } else {
      // Custom column → set status to "todo" and track in customColumnMap
      setStatus(taskId, "todo");
      setCustomColumnMap((prev) => ({ ...prev, [taskId]: col.id }));
    }
  };

  const addColumn = () => {
    const newId = `col-custom-${Date.now()}`;
    setColumns((prev) => [...prev, { id: newId, label: "New Stage", statusFilter: undefined }]);
    // Auto-start editing the new column label
    setEditingColId(newId);
    setEditingColLabel("New Stage");
  };

  const deleteColumn = (colId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    // Move tasks from deleted custom column back to "todo"
    setCustomColumnMap((prev) => {
      const next = { ...prev };
      for (const [tid, cid] of Object.entries(next)) {
        if (cid === colId) delete next[tid];
      }
      return next;
    });
  };

  const startEditCol = (col: KanbanColumn) => {
    setEditingColId(col.id);
    setEditingColLabel(col.label);
  };

  const commitEditCol = () => {
    if (!editingColId) return;
    setColumns((prev) =>
      prev.map((c) => c.id === editingColId ? { ...c, label: editingColLabel.trim() || c.label } : c)
    );
    setEditingColId(null);
  };

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  return (
    <ShellLayout>
      <Link
        href="/todo"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-3 transition-colors hover:opacity-70"
        style={{ color: "var(--color-muted)" }}
      >
        <Icon name="arrow-left" size={13} /> Projects
      </Link>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <PageHeader title="All Tasks" subtitle={`${filtered.length} of ${tasks.length} tasks`} />
        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)" }}>
          <button
            onClick={() => setViewMode("list")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors"
            style={{
              background: viewMode === "list" ? "var(--color-surface)" : "transparent",
              color: viewMode === "list" ? "var(--color-ink)" : "var(--color-muted)",
              boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
            aria-label="List view"
          >
            <Icon name="list-check" size={14} /> List
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors"
            style={{
              background: viewMode === "kanban" ? "var(--color-surface)" : "transparent",
              color: viewMode === "kanban" ? "var(--color-ink)" : "var(--color-muted)",
              boxShadow: viewMode === "kanban" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
            aria-label="Kanban view"
          >
            <Icon name="chart-bar" size={14} /> Kanban
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        {viewMode === "list" && (
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        {viewMode === "kanban" && <div />}
        <div className="relative w-full sm:w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted-soft)" }}>
            <Icon name="search" size={13} />
          </span>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="pl-9" />
        </div>
      </div>

      {viewMode === "list" ? (
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm font-medium text-center py-12" style={{ color: "var(--color-muted-soft)" }}>No tasks found.</p>
          ) : (
            <div>
              {filtered.map((task, i) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projectName={projectName(task.projectId)}
                  first={i === 0}
                  onToggle={() => toggleDone(task.id)}
                  onOpen={() => setOpenTaskId(task.id)}
                />
              ))}
            </div>
          )}
        </Card>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 items-start">
            {columns.map((col) => {
              const colTasks = tasksForColumn(col);
              return (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  tasks={colTasks}
                  isEditing={editingColId === col.id}
                  editingLabel={editingColLabel}
                  onEditLabelChange={setEditingColLabel}
                  onStartEdit={() => startEditCol(col)}
                  onCommitEdit={commitEditCol}
                  onDelete={() => deleteColumn(col.id)}
                  onOpenTask={(id) => setOpenTaskId(id)}
                  projectName={projectName}
                  projectColor={projectColor}
                />
              );
            })}
            {/* Add column button */}
            <button
              onClick={addColumn}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium transition-colors hover:opacity-80"
              style={{
                minWidth: 200,
                background: "var(--color-canvas)",
                border: "2px dashed var(--color-hairline)",
                color: "var(--color-muted)",
              }}
            >
              <Icon name="plus" size={14} /> Add column
            </button>
          </div>
          <DragOverlay>
            {activeTask ? (
              <KanbanCard
                task={activeTask}
                projectName={projectName(activeTask.projectId)}
                projectColor={projectColor(activeTask.projectId)}
                onOpen={() => {}}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskDetailDialog taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </ShellLayout>
  );
}

// ─── List view row ────────────────────────────────────────────────────────────

function TaskRow({ task, projectName, first, onToggle, onOpen }: {
  task: Task; projectName: string; first: boolean; onToggle: () => void; onOpen: () => void;
}) {
  const done = task.status === "done";
  const meta = STATUS_META[task.status];
  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--color-canvas)]"
      style={{ borderTop: first ? "none" : "1px solid var(--color-hairline)" }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="w-[18px] h-[18px] rounded-md flex-shrink-0 flex items-center justify-center transition-colors"
        style={{
          border: done ? "2px solid #5DB872" : "2px solid var(--color-hairline)",
          background: done ? "#5DB872" : "transparent",
        }}
        aria-label="Toggle done"
      >
        {done && <Icon name="check" size={11} className="text-white" />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] font-medium truncate"
          style={{ color: done ? "var(--color-muted-soft)" : "var(--color-ink)", textDecoration: done ? "line-through" : "none" }}
        >
          {task.title}
        </p>
        <span className="text-[11px]" style={{ color: "var(--color-muted-soft)" }}>{projectName}</span>
      </div>

      <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] flex-shrink-0" style={{ color: "var(--color-muted)" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
        {meta.label}
      </span>
      <Badge variant={task.priority} className="capitalize flex-shrink-0">{task.priority}</Badge>
      <div className="w-16 flex justify-end flex-shrink-0">
        <DeadlineLabel deadline={task.deadline} status={task.status} />
      </div>
      <span className="w-10 text-right text-[11px] flex-shrink-0" style={{ color: "var(--color-muted-soft)" }}>
        {task.hours ? `${task.hours}h` : ""}
      </span>
    </div>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  col, tasks, isEditing, editingLabel, onEditLabelChange, onStartEdit, onCommitEdit, onDelete, onOpenTask, projectName, projectColor,
}: {
  col: KanbanColumn;
  tasks: Task[];
  isEditing: boolean;
  editingLabel: string;
  onEditLabelChange: (v: string) => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onDelete: () => void;
  onOpenTask: (id: string) => void;
  projectName: (id: string) => string;
  projectColor: (id: string) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 flex flex-col rounded-xl transition-colors"
      style={{
        width: 260,
        minHeight: 120,
        background: isOver ? "var(--color-canvas)" : "var(--color-surface)",
        border: isOver ? "2px solid var(--color-accent, #6366f1)" : "1px solid var(--color-hairline)",
        padding: "12px 10px",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditing ? (
            <input
              ref={inputRef}
              autoFocus
              value={editingLabel}
              onChange={(e) => onEditLabelChange(e.target.value)}
              onBlur={onCommitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") onCommitEdit(); if (e.key === "Escape") onCommitEdit(); }}
              className="text-[12px] font-bold uppercase tracking-wider bg-transparent border-b outline-none flex-1 min-w-0"
              style={{ color: "var(--color-muted)", borderColor: "var(--color-hairline)" }}
            />
          ) : (
            <button
              onClick={onStartEdit}
              className="text-[12px] font-bold uppercase tracking-wider truncate hover:opacity-70 transition-opacity text-left"
              style={{ color: "var(--color-muted)" }}
              title="Click to rename"
            >
              {col.label}
            </button>
          )}
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ color: "var(--color-muted-soft)", background: "var(--color-canvas)" }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onDelete}
          className="ml-1 flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: "var(--color-muted)" }}
          aria-label={`Delete column ${col.label}`}
        >
          <Icon name="x" size={13} />
        </button>
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-2 flex-1">
        {tasks.length === 0 && (
          <p className="text-[12px] px-1 py-6 text-center" style={{ color: "var(--color-muted-soft)" }}>
            Drop tasks here
          </p>
        )}
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            projectName={projectName(task.projectId)}
            projectColor={projectColor(task.projectId)}
            onOpen={() => onOpenTask(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Kanban card ──────────────────────────────────────────────────────────────

function KanbanCard({
  task, projectName, projectColor, onOpen, isDragging,
}: {
  task: Task;
  projectName: string;
  projectColor: string;
  onOpen: () => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isBeingDragged } = useDraggable({ id: task.id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isBeingDragged ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.18)" : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-[10px] border bg-[var(--color-surface)] p-3 select-none transition-shadow hover:shadow-sm"
      onClick={(e) => {
        // Only open dialog if not dragging
        if (!isBeingDragged) { e.stopPropagation(); onOpen(); }
      }}
    >
      <p className="text-[13px] font-medium leading-snug mb-2" style={{ color: "var(--color-ink)" }}>
        {task.title}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Project dot + name */}
        <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-soft)" }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: projectColor }} />
          {projectName}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Badge variant={task.priority} className="capitalize">{task.priority}</Badge>
        {task.deadline && (
          <DeadlineLabel deadline={task.deadline} status={task.status} />
        )}
      </div>
    </div>
  );
}
