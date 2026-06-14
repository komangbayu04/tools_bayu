"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { STATUS_META, progressOf, DeadlineLabel, isProjectComplete } from "../shared";
import { TaskDetailDialog } from "../TaskDetailDialog";
import { format, differenceInCalendarDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

type ViewMode = "kanban" | "timeline";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
      {children}
    </label>
  );
}

function remainingMeta(task: Task): { label: string; color: string } {
  if (task.status === "done") return { label: "Selesai", color: "#5DB872" };
  if (!task.deadline) return { label: "Tanpa deadline", color: "var(--color-muted-soft)" };
  const days = differenceInCalendarDays(new Date(task.deadline), new Date());
  if (days < 0) return { label: `Telat ${Math.abs(days)} hari`, color: "#C64545" };
  if (days === 0) return { label: "Hari ini", color: "#E8A55A" };
  if (days === 1) return { label: "Besok", color: "#E8A55A" };
  return { label: `${days} hari lagi`, color: "var(--color-body)" };
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
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

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

  const [showAdd, setShowAdd] = useState(false);
  const [tTitle, setTTitle] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tPriority, setTPriority] = useState<Priority>("medium");
  const [tStatus, setTStatus] = useState<TaskStatus>("todo");
  const [tDeadline, setTDeadline] = useState("");
  const [tHours, setTHours] = useState("");

  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const { done, total, pct } = progressOf(projectTasks);
  const complete = isProjectComplete(projectTasks);

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
              {complete ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: "color-mix(in srgb, #5DB872 16%, transparent)", color: "#3d8a52" }}
                >
                  <Icon name="check-circle" size={12} /> Selesai
                </span>
              ) : project.status !== "active" && <Badge variant="gray" className="capitalize">{project.status}</Badge>}
            </div>
            <p className="text-[13px] mt-1" style={{ color: "var(--color-muted)" }}>{project.client}</p>
            <div className="flex items-center gap-2.5 mt-3 max-w-xs">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-canvas)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: project.color }} />
              </div>
              <span className="text-[11px] flex-shrink-0" style={{ color: "var(--color-muted-soft)" }}>{done}/{total} done</span>
            </div>
          </div>

          {/* Actions + View Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode toggle */}
            <div
              className="flex items-center rounded-xl p-1 gap-0.5"
              style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)" }}
            >
              {(["kanban", "timeline"] as ViewMode[]).map((mode) => {
                const active = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                    style={active
                      ? { background: "var(--color-surface)", color: "var(--color-ink)", boxShadow: "var(--shadow-card)" }
                      : { color: "var(--color-muted)" }}
                  >
                    <Icon name={mode === "kanban" ? "columns" : "calendar"} size={12} />
                    {mode === "kanban" ? "Kanban" : "Timeline"}
                  </button>
                );
              })}
            </div>
            <Button onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={15} /> Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Content — animated switch between Kanban and Timeline */}
      <AnimatePresence mode="wait">
        {viewMode === "kanban" ? (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
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
          </motion.div>
        ) : (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <ProjectTimeline tasks={projectTasks} color={project.color} onOpen={setOpenTaskId} />
          </motion.div>
        )}
      </AnimatePresence>

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

function ProjectTimeline({ tasks, color, onOpen }: { tasks: Task[]; color: string; onOpen: (id: string) => void }) {
  const dated = tasks
    .filter((t) => t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  const undated = tasks.filter((t) => !t.deadline);
  const ordered = [...dated, ...undated];

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--color-primary-light)" }}>
          <Icon name="calendar" size={20} style={{ color: "var(--color-primary)" }} />
        </div>
        <p className="text-[14px] font-semibold" style={{ color: "var(--color-ink)" }}>Belum ada task</p>
        <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>Tambah task untuk melihat timeline</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {ordered.map((task, i) => {
        const meta = STATUS_META[task.status];
        const rem = remainingMeta(task);
        const isLast = i === ordered.length - 1;

        return (
          <div key={task.id} className="flex gap-0 items-stretch">
            {/* LEFT: timeline rail */}
            <div className="flex flex-col items-center" style={{ width: 160, minWidth: 160, flexShrink: 0 }}>
              {/* Date label */}
              <div className="pt-3 pb-2 text-right pr-4 w-full">
                <p
                  className="text-[11px] font-bold tabular-nums leading-tight"
                  style={{ color: task.deadline ? "var(--color-ink)" : "var(--color-muted-soft)" }}
                >
                  {task.deadline
                    ? format(new Date(task.deadline), "d MMM", { locale: idLocale })
                    : "—"}
                </p>
                {task.deadline && (
                  <p className="text-[10px]" style={{ color: "var(--color-muted-soft)" }}>
                    {format(new Date(task.deadline), "yyyy", { locale: idLocale })}
                  </p>
                )}
              </div>
            </div>

            {/* CENTER: dot + vertical line */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
              {/* top connector */}
              <div className="w-px flex-1" style={{ background: i === 0 ? "transparent" : "var(--color-hairline)", minHeight: 12 }} />
              {/* dot node */}
              <div
                className="relative z-10 w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "var(--color-surface-card)",
                  border: `2.5px solid ${task.status === "done" ? "#5DB872" : meta.color}`,
                  boxShadow: `0 0 0 3px color-mix(in srgb, ${task.status === "done" ? "#5DB872" : meta.color} 14%, transparent)`,
                }}
              >
                {task.status === "done" && (
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#5DB872" }} />
                )}
                {task.status === "in_progress" && (
                  <span className="w-[6px] h-[6px] rounded-full animate-pulse" style={{ background: meta.color }} />
                )}
              </div>
              {/* bottom connector */}
              {!isLast && (
                <div className="w-px flex-1" style={{ background: "var(--color-hairline)", minHeight: 16 }} />
              )}
            </div>

            {/* RIGHT: task card */}
            <div className="flex-1 min-w-0 py-3 pl-4 pr-0 pb-5">
              <button
                onClick={() => onOpen(task.id)}
                className="w-full text-left rounded-[14px] border p-4 transition-all hover:shadow-md group"
                style={{
                  background: "var(--color-surface-card)",
                  borderColor: "var(--color-hairline)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* Card header row */}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-semibold leading-snug flex-1 group-hover:text-[var(--color-primary)] transition-colors" style={{ color: "var(--color-ink)" }}>
                    {task.title}
                  </p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                    style={{
                      background: `color-mix(in srgb, ${rem.color} 14%, transparent)`,
                      color: rem.color,
                    }}
                  >
                    {rem.label}
                  </span>
                </div>

                {/* Description */}
                {task.description && (
                  <p className="text-[12px] mt-1.5 line-clamp-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    {task.description}
                  </p>
                )}

                {/* Footer row */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                    style={{
                      background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                      color: meta.color,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                  <Badge variant={task.priority} className="capitalize">{task.priority}</Badge>
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
              </button>
            </div>
          </div>
        );
      })}
    </div>
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
