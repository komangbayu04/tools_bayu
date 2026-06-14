"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { Icon } from "@/components/ui/icon";
import { GlowCard, GlowStat } from "@/components/ui/glowing-card";
import { format, isSameDay, startOfWeek, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Link from "next/link";
import { useState } from "react";
import {
  useTaskStore,
  useProjectStore,
  useFinanceStore,
  useInvoiceHistoryStore,
  useMoodStore,
  type Task,
  type TaskStatus,
} from "@/lib/store";

// ── Status badge config (matches reference: green / purple / blue) ──
const STATUS_BADGE: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  in_progress: { label: "In Progress", color: "#2E9E5B", bg: "rgba(46,158,91,0.12)" },
  todo:        { label: "Pending",     color: "#8C5CD6", bg: "rgba(140,92,214,0.12)" },
  done:        { label: "Completed",   color: "#4A7DE8", bg: "rgba(74,125,232,0.12)" },
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 11) return "Good Morning";
  if (h < 15) return "Good Afternoon";
  if (h < 19) return "Good Evening";
  return "Good Night";
};

export default function DashboardPage() {
  const today = new Date();

  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { transactions } = useFinanceStore();
  const { history } = useInvoiceHistoryStore();
  const { items: moodItems } = useMoodStore();
  void transactions; void history; void moodItems;

  const project = (id: string) => projects.find((p) => p.id === id);
  const projectName = (id: string) => project(id)?.name ?? "—";
  const projectColor = (id: string) => project(id)?.color ?? "#4e7d2e";

  const openTasks  = tasks.filter((t) => t.status !== "done");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const completed  = tasks.filter((t) => t.status === "done");
  const activeProjects = projects.filter((p) => p.status === "active");
  const hoursTracked = completed.reduce((s, t) => s + (t.hours || 0), 0);

  // ── Schedule: week day picker ──
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const scheduleTasks = tasks.filter(
    (t) => t.deadline && isSameDay(new Date(t.deadline + "T00:00:00"), selectedDay)
  );

  // ── My tasks table (top 5 open, in-progress first) ──
  const tableTasks = [...tasks]
    .sort((a, b) => {
      const rank = (t: Task) => (t.status === "in_progress" ? 0 : t.status === "todo" ? 1 : 2);
      return rank(a) - rank(b);
    })
    .slice(0, 5);

  // ── Notes: recent tasks that have a description ──
  const notes = tasks
    .filter((t) => t.description && t.description.trim().length > 0)
    .slice(0, 4);

  return (
    <ShellLayout>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-[13px] font-medium mb-1" style={{ color: "var(--color-muted)" }}>
            {format(today, "EEEE, d MMMM yyyy")}
          </p>
          <h1 className="text-[30px] font-bold tracking-tight" style={{ color: "var(--color-ink)" }}>
            {greeting()}, Bayu
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/moodboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
            style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)", color: "var(--color-body)" }}
          >
            <Icon name="external-link" size={14} /> Share
          </Link>
          <Link
            href="/todo"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[var(--color-on-primary)] transition-opacity hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            <Icon name="plus" size={14} /> Add Task
          </Link>
        </div>
      </div>

      {/* ── Hero stats (glow highlight) ── */}
      <GlowCard className="mb-6">
        <div className="px-6 py-5 flex items-center gap-6 flex-wrap sm:flex-nowrap">
          <GlowStat icon="clock" value={`${hoursTracked}h`} label="Time Tracked" />
          <div className="hidden sm:block w-px h-10 self-center" style={{ background: "rgba(255,255,255,0.12)" }} />
          <GlowStat icon="check-circle" value={String(completed.length)} label="Tasks Completed" />
          <div className="hidden sm:block w-px h-10 self-center" style={{ background: "rgba(255,255,255,0.12)" }} />
          <GlowStat icon="circle-dot" value={String(inProgress.length)} label="Tasks In-progress" />
          <div className="hidden md:block w-px h-10 self-center" style={{ background: "rgba(255,255,255,0.12)" }} />
          <GlowStat icon="folder-open" value={String(activeProjects.length)} label="Active Projects" />
        </div>
      </GlowCard>

      {/* ── My Tasks table ── */}
      <div
        className="rounded-[18px] overflow-hidden mb-6"
        style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(78,125,46,0.10)" }}>
              <Icon name="list-check" size={15} style={{ color: "var(--color-primary)" }} />
            </div>
            <p className="text-[15px] font-bold" style={{ color: "var(--color-ink)" }}>Task Saya</p>
          </div>
          <Link href="/todo/all" className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70" style={{ color: "var(--color-primary)" }}>
            See All <Icon name="arrow-right" size={11} />
          </Link>
        </div>

        {/* Table header */}
        <div
          className="grid grid-cols-[1fr_140px_120px] gap-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-muted)", borderTop: "1px solid var(--color-hairline)", borderBottom: "1px solid var(--color-hairline)" }}
        >
          <span>Task Name</span>
          <span>Project</span>
          <span>Status</span>
        </div>

        {/* Rows */}
        {tableTasks.length === 0 ? (
          <p className="text-center py-10 text-[13px]" style={{ color: "var(--color-muted-soft)" }}>Belum ada task.</p>
        ) : (
          tableTasks.map((t, i) => {
            const badge = STATUS_BADGE[t.status];
            const pColor = projectColor(t.projectId);
            return (
              <Link
                key={t.id}
                href="/todo"
                className="grid grid-cols-[1fr_140px_120px] gap-4 px-5 py-3.5 items-center transition-colors hover:bg-[var(--color-canvas)]"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${pColor}18` }}>
                    <Icon name="check-square" size={14} style={{ color: pColor }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>{t.title}</p>
                    {t.hours ? (
                      <span className="text-[11px]" style={{ color: "var(--color-muted-soft)" }}>{t.hours}h estimated</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pColor }} />
                  <span className="text-[12px] truncate" style={{ color: "var(--color-body)" }}>{projectName(t.projectId)}</span>
                </div>
                <span
                  className="inline-flex items-center justify-center text-[11px] font-semibold rounded-full px-2.5 py-1 w-fit"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  {badge.label}
                </span>
              </Link>
            );
          })
        )}
      </div>

      {/* ── Bottom row: Schedule + Notes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule */}
        <div
          className="rounded-[18px] p-5"
          style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(232,165,90,0.12)" }}>
              <Icon name="calendar" size={15} style={{ color: "#E8A55A" }} />
            </div>
            <p className="text-[15px] font-bold" style={{ color: "var(--color-ink)" }}>Jadwal</p>
          </div>

          {/* Week day picker */}
          <div className="grid grid-cols-7 gap-1.5 mb-5">
            {weekDays.map((d) => {
              const active = isSameDay(d, selectedDay);
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDay(d)}
                  className="flex flex-col items-center py-2 rounded-xl transition-colors"
                  style={
                    active
                      ? { background: "var(--color-primary)", color: "var(--color-on-primary)" }
                      : { color: isToday ? "var(--color-primary)" : "var(--color-muted)" }
                  }
                >
                  <span className="text-[10px] font-medium uppercase">{format(d, "EEEEEE", { locale: idLocale })}</span>
                  <span className="text-[14px] font-bold mt-0.5">{format(d, "d")}</span>
                </button>
              );
            })}
          </div>

          {/* Schedule items */}
          <div className="flex flex-col gap-2.5">
            {scheduleTasks.length === 0 ? (
              <p className="text-center py-8 text-[12px]" style={{ color: "var(--color-muted-soft)" }}>
                Tidak ada deadline pada {format(selectedDay, "d MMM")}.
              </p>
            ) : (
              scheduleTasks.map((t) => {
                const pColor = projectColor(t.projectId);
                return (
                  <Link
                    key={t.id}
                    href="/todo"
                    className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--color-canvas)]"
                    style={{ borderLeft: `3px solid ${pColor}`, background: "var(--color-canvas)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>{t.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                        {projectName(t.projectId)} · {STATUS_BADGE[t.status].label}
                      </p>
                    </div>
                    <Icon name="arrow-right" size={13} style={{ color: "var(--color-muted-soft)" }} />
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Notes */}
        <div
          className="rounded-[18px] p-5"
          style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,106,232,0.12)" }}>
              <Icon name="file-text" size={15} style={{ color: "#7C6AE8" }} />
            </div>
            <p className="text-[15px] font-bold" style={{ color: "var(--color-ink)" }}>Catatan</p>
          </div>

          <div className="flex flex-col">
            {notes.length === 0 ? (
              <p className="text-center py-8 text-[12px]" style={{ color: "var(--color-muted-soft)" }}>Belum ada catatan dari task.</p>
            ) : (
              notes.map((t, i) => {
                const done = t.status === "done";
                return (
                  <Link
                    key={t.id}
                    href="/todo"
                    className="flex items-start gap-3 py-3.5 transition-colors"
                    style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
                  >
                    <span
                      className="w-[18px] h-[18px] rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"
                      style={{
                        border: done ? "none" : "2px solid var(--color-hairline)",
                        background: done ? "#7C6AE8" : "transparent",
                      }}
                    >
                      {done && <Icon name="check" size={10} className="text-white" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[13px] font-semibold leading-snug"
                        style={{ color: "var(--color-ink)", textDecoration: done ? "line-through" : "none" }}
                      >
                        {t.title}
                      </p>
                      <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--color-muted)" }}>
                        {t.description}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}
