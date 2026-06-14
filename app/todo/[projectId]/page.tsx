"use client";

import { useState } from "react";
import {
  DndContext, DragOverlay,
  PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShellLayout } from "@/components/shell/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  useTaskStore, useProjectStore,
  type Priority, type TaskStatus, type Task,
} from "@/lib/store";
import { STATUS_META, progressOf, DeadlineLabel } from "../shared";
import { TaskDetailDialog } from "../TaskDetailDialog";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
      {children}
    </label>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const setStatus = useTaskStore((s) => s.setStatus);
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setStatus(String(active.id), over.id as TaskStatus);
    }
    setActiveTaskId(null);
  };

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  // Add task dialog
  const [showAdd, setShowAdd] = useState(false);
  const [tTitle, setTTitle] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tPriority, setTPriority] = useState<Priority>("medium");
  const [tStatus, setTStatus] = useState<TaskStatus>("todo");
  const [tDeadline, setTDeadline] = useState("");
  const [tHours, setTHours] = useState("");

  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const { done, total, pct } = progressOf(projectTasks);

  const resetAdd = () => {
    setTTitle(""); setTDesc(""); setTPriority("medium"); setTStatus("todo"); setTDeadline(""); setTHours("");
  };

  const handleAdd = () => {
    if (!tTitle.trim()) return;
    addTask({
      title: tTitle.trim(),
      description: tDesc.trim() || undefined,
      projectId,
      priority: tPriority,
      status: tStatus,
      deadline: tDeadline || undefined,
      hours: tHours === "" ? undefined : Number(tHours),
      source: "manual",
    });
    resetAdd();
    setShowAdd(false);
  };

  if (!project) {
    return (
      <ShellLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>Project not found.</p>
          <Link href="/todo">
            <Button variant="secondary"><Icon name="arrow-left" size={14} /> Back to Projects</Button>
          </Link>
        </div>
      </ShellLayout>
    );
  }

  return (
    <ShellLayout>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/todo"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-3 transition-colors hover:opacity-70"
          style={{ color: "var(--color-muted)" }}
        >
          <Icon name="arrow-left" size={13} /> Projects
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
              <h1 className="text-[24px] font-bold tracking-tight truncate" style={{ color: "var(--color-ink)" }}>{project.name}</h1>
              {project.status !== "active" && <Badge variant="gray" className="capitalize">{project.status}</Badge>}
            </div>
            <p className="text-[13px] mt-1" style={{ color: "var(--color-muted)" }}>{project.client}</p>
            <div className="flex items-center gap-2.5 mt-3 max-w-xs">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-canvas)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: project.color }} />
              </div>
              <span className="text-[11px] flex-shrink-0" style={{ color: "var(--color-muted-soft)" }}>{done}/{total} done</span>
            </div>
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={15} /> Add Task
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = projectTasks
              .filter((t) => t.status === col)
              .sort((a, b) => a.order - b.order);
            const meta = STATUS_META[col];
            return (
              <DroppableColumn key={col} col={col}>
                <Card className="p-3">
                  <div className="flex items-center justify-between px-1.5 py-1 mb-2">
                    <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md" style={{ color: "var(--color-muted-soft)", background: "var(--color-canvas)" }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 min-h-[40px]">
                    {colTasks.length === 0 && (
                      <p className="text-[12px] px-1.5 py-4 text-center" style={{ color: "var(--color-muted-soft)" }}>No tasks</p>
                    )}
                    {colTasks.map((task) => (
                      <DraggableTaskChip key={task.id} task={task} onOpen={() => setOpenTaskId(task.id)} onSetStatus={(s) => setStatus(task.id, s)} />
                    ))}
                  </div>
                </Card>
              </DroppableColumn>
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="rounded-[10px] border p-3 shadow-lg bg-[var(--color-surface)] opacity-95" style={{ borderColor: "var(--color-hairline)" }}>
              <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--color-ink)" }}>{activeTask.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={activeTask.priority} className="capitalize">{activeTask.priority}</Badge>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailDialog taskId={openTaskId} onClose={() => setOpenTaskId(null)} />

      {/* Add Task Dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); resetAdd(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>{project.name} · {project.client}</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <FieldLabel>Title</FieldLabel>
              <Input autoFocus value={tTitle} onChange={(e) => setTTitle(e.target.value)} placeholder="Task title" />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Textarea rows={2} value={tDesc} onChange={(e) => setTDesc(e.target.value)} placeholder="Optional details…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Priority</FieldLabel>
                <Select value={tPriority} onChange={(e) => setTPriority(e.target.value as Priority)}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select value={tStatus} onChange={(e) => setTStatus(e.target.value as TaskStatus)}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Deadline</FieldLabel>
                <Input type="date" value={tDeadline} onChange={(e) => setTDeadline(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Hours</FieldLabel>
                <Input type="number" min={0} step={0.5} value={tHours} onChange={(e) => setTHours(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => { setShowAdd(false); resetAdd(); }}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!tTitle.trim()}>Add Task</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}

function DroppableColumn({ col, children }: { col: TaskStatus; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: col });
  return (
    <div
      ref={setNodeRef}
      className="rounded-xl transition-colors"
      style={isOver ? { background: "var(--color-canvas)", boxShadow: "inset 0 0 0 2px var(--color-hairline)" } : {}}
    >
      {children}
    </div>
  );
}

function DraggableTaskChip({ task, onOpen, onSetStatus }: { task: Task; onOpen: () => void; onSetStatus: (s: TaskStatus) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined }
    : { opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskChip task={task} onOpen={isDragging ? () => {} : onOpen} onSetStatus={onSetStatus} />
    </div>
  );
}

function TaskChip({ task, onOpen, onSetStatus }: { task: Task; onOpen: () => void; onSetStatus: (s: TaskStatus) => void }) {
  return (
    <div
      onClick={onOpen}
      className="group rounded-[10px] border p-3 cursor-pointer transition-all hover:shadow-sm bg-[var(--color-surface)]"
      style={{ borderColor: "var(--color-hairline)" }}
    >
      <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--color-ink)" }}>{task.title}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <Badge variant={task.priority} className="capitalize">{task.priority}</Badge>
        <DeadlineLabel deadline={task.deadline} status={task.status} />
        {task.hours ? (
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted-soft)" }}>
            <Icon name="clock" size={10} /> {task.hours}h
          </span>
        ) : null}
        {task.invoiceLinked && (
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--color-primary)" }}>
            <Icon name="receipt" size={10} /> invoiced
          </span>
        )}
      </div>
      {/* Quick status buttons */}
      <div className="flex items-center gap-1 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        {COLUMNS.filter((c) => c !== task.status).map((c) => (
          <button
            key={c}
            onClick={() => onSetStatus(c)}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors hover:bg-[var(--color-canvas)]"
            style={{ color: "var(--color-muted)", border: "1px solid var(--color-hairline)" }}
          >
            → {STATUS_META[c].label}
          </button>
        ))}
      </div>
    </div>
  );
}
