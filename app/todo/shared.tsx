"use client";

import { format, isPast, isToday } from "date-fns";
import { Icon } from "@/components/ui/icon";
import { type Priority, type TaskStatus, type Task } from "@/lib/store";

export const PRIORITY_BADGE: Record<Priority, "high" | "medium" | "low"> = {
  high: "high",
  medium: "medium",
  low: "low",
};

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "To Do", color: "var(--color-muted-soft)" },
  in_progress: { label: "In Progress", color: "#E8A55A" },
  done: { label: "Done", color: "#5DB872" },
};

export const PROJECT_PALETTE = [
  "#4e7d2e", "#6D8DF0", "#E8A55A", "#C77DD6", "#5DB872", "#D85A4A", "#4DBFC4", "#F0A07C",
];

/** Deadline pill — red text when overdue and not done. */
export function DeadlineLabel({ deadline, status, className }: { deadline?: string; status: TaskStatus; className?: string }) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const overdue = status !== "done" && isPast(d) && !isToday(d);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] flex-shrink-0 ${className ?? ""}`}
      style={{ color: overdue ? "#C64545" : "var(--color-muted-soft)" }}
    >
      <Icon name="clock" size={10} />
      {format(d, "d MMM")}
    </span>
  );
}

export function progressOf(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}
