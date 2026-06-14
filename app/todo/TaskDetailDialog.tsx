"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { useTaskStore, useProjectStore, type Task, type Priority, type TaskStatus } from "@/lib/store";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
      {children}
    </label>
  );
}

export function TaskDetailDialog({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === taskId));
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const projects = useProjectStore((s) => s.projects);

  const [draft, setDraft] = useState<Task | null>(null);

  useEffect(() => {
    setDraft(task ? { ...task } : null);
  }, [task]);

  const open = !!taskId && !!draft;
  const project = draft ? projects.find((p) => p.id === draft.projectId) : undefined;

  const patch = (p: Partial<Task>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const handleSave = () => {
    if (!draft) return;
    updateTask(draft.id, {
      title: draft.title.trim() || "Untitled task",
      description: draft.description,
      priority: draft.priority,
      status: draft.status,
      deadline: draft.deadline || undefined,
      hours: draft.hours,
      invoiceLinked: draft.invoiceLinked,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!draft) return;
    deleteTask(draft.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {draft && (
          <>
            <DialogHeader>
              <DialogTitle>Task Details</DialogTitle>
              <DialogDescription>{project ? `${project.name} · ${project.client}` : "Edit task"}</DialogDescription>
            </DialogHeader>
            <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-auto">
              <div>
                <Label>Title</Label>
                <Input value={draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Task title" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={draft.description ?? ""} onChange={(e) => patch({ description: e.target.value })} placeholder="Add details…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={draft.priority} onChange={(e) => patch({ priority: e.target.value as Priority })}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={draft.status} onChange={(e) => patch({ status: e.target.value as TaskStatus })}>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Deadline</Label>
                  <Input type="date" value={draft.deadline ?? ""} onChange={(e) => patch({ deadline: e.target.value })} />
                  {draft.deadline && (
                    <p className="text-[11px] mt-1" style={{ color: "var(--color-muted-soft)" }}>
                      {format(new Date(draft.deadline), "d MMM yyyy")}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={draft.hours ?? ""}
                    onChange={(e) => patch({ hours: e.target.value === "" ? undefined : Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => patch({ invoiceLinked: !draft.invoiceLinked })}
                className="flex items-center justify-between rounded-[10px] border px-3.5 py-3 transition-colors text-left"
                style={{
                  borderColor: draft.invoiceLinked ? "#2A9D8F" : "var(--color-hairline)",
                  background: draft.invoiceLinked ? "var(--color-primary-light)" : "var(--color-surface)",
                }}
              >
                <span className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>
                  <Icon name="receipt" size={14} style={{ color: "var(--color-muted)" }} />
                  Linked to invoice
                </span>
                <span
                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                  style={{ background: draft.invoiceLinked ? "#2A9D8F" : "var(--color-hairline)" }}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                    style={{ transform: draft.invoiceLinked ? "translateX(18px)" : "translateX(2px)" }}
                  />
                </span>
              </button>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button variant="danger" onClick={handleDelete}>
                  <Icon name="trash" size={14} /> Delete
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                  <Button onClick={handleSave}>
                    <Icon name="save" size={14} /> Save
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
