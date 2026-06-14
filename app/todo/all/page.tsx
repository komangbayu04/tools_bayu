"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useTaskStore, useProjectStore,
  type TaskStatus, type Task,
} from "@/lib/store";
import { STATUS_META, DeadlineLabel } from "../shared";
import { TaskDetailDialog } from "../TaskDetailDialog";

type Filter = "all" | TaskStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export default function AllTasksPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const toggleDone = useTaskStore((s) => s.toggleDone);
  const projects = useProjectStore((s) => s.projects);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";

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

  return (
    <ShellLayout>
      <Link
        href="/todo"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-3 transition-colors hover:opacity-70"
        style={{ color: "var(--color-muted)" }}
      >
        <Icon name="arrow-left" size={13} /> Projects
      </Link>
      <PageHeader title="All Tasks" subtitle={`${filtered.length} of ${tasks.length} tasks`} />

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted-soft)" }}>
            <Icon name="search" size={13} />
          </span>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="pl-9" />
        </div>
      </div>

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

      <TaskDetailDialog taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </ShellLayout>
  );
}

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
