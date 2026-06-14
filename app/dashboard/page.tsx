"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { Icon } from "@/components/ui/icon";
import { format, isPast, isToday } from "date-fns";
import Link from "next/link";
import {
  useTaskStore,
  useProjectStore,
  useFinanceStore,
  useInvoiceHistoryStore,
  useMoodStore,
  type Priority,
} from "@/lib/store";

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "#D85A4A",
  medium: "#E8A55A",
  low: "#5DB872",
};

export default function DashboardPage() {
  const today = new Date();
  const currentMonth = format(today, "yyyy-MM");

  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { transactions } = useFinanceStore();
  const { history } = useInvoiceHistoryStore();
  const { items: moodItems } = useMoodStore();

  void history; void moodItems;

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const projectColor = (id: string) => projects.find((p) => p.id === id)?.color ?? "#2A9D8F";

  const openTasks   = tasks.filter((t) => t.status !== "done");
  const inProgress  = tasks.filter((t) => t.status === "in_progress");
  const completed   = tasks.filter((t) => t.status === "done");
  const activeProjects = projects.filter((p) => p.status === "active");

  const monthTx  = transactions.filter((t) => t.month === currentMonth);
  const income   = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense  = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance  = income - expense;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
  const maxFin   = Math.max(income, expense, 1);

  const donePct  = Math.round((completed.length / Math.max(1, tasks.length)) * 100);

  const upcoming = [...openTasks]
    .sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    })
    .slice(0, 6);

  return (
    <ShellLayout>
      <div className="flex gap-7 items-start min-h-full">

        {/* ── LEFT MAIN ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Welcome header */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #2A9D8F, #1C4F4F)" }}
              >
                BK
              </div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-muted)" }}>
                {format(today, "EEEE, d MMMM yyyy")}
              </p>
            </div>
            <h1 className="text-[26px] font-bold tracking-tight mt-1" style={{ color: "var(--color-ink)" }}>
              Welcome, Bayu.
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--color-muted)" }}>
              Your personal dashboard overview
            </p>
          </div>

          {/* Profile + gradient task cards */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.3fr_1.3fr] gap-4">

            {/* Profile card */}
            <div
              className="rounded-[18px] p-5 flex flex-col items-center text-center"
              style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <p className="text-[12px] font-semibold" style={{ color: "var(--color-muted)" }}>Profile</p>
                <button className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-canvas)]" style={{ color: "var(--color-muted-soft)" }}>
                  <Icon name="arrow-right" size={12} />
                </button>
              </div>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-[18px] font-bold text-white mb-3 ring-4"
                style={{
                  background: "linear-gradient(135deg, #2A9D8F 0%, #1C4F4F 100%)",
                  outline: "4px solid rgba(42,157,143,0.15)",
                }}
              >
                BK
              </div>
              <p className="text-[14px] font-bold leading-tight" style={{ color: "var(--color-ink)" }}>Bayu Krisnayana</p>
              <p className="text-[11px] mt-0.5 mb-4" style={{ color: "var(--color-muted)" }}>Graphic Designer</p>
              <div className="flex items-center justify-center gap-3 w-full">
                <Pill icon="folder" value={activeProjects.length} color="#1C4F4F" bg="rgba(28,79,79,0.08)" label="projects" />
                <Pill icon="list-check" value={openTasks.length} color="#2A9D8F" bg="rgba(42,157,143,0.09)" label="open" />
                <Pill icon="check-circle" value={completed.length} color="#5DB872" bg="rgba(93,184,114,0.10)" label="done" />
              </div>
            </div>

            {/* Gradient card: task completion */}
            <div
              className="rounded-[18px] p-5 flex flex-col justify-between min-h-[190px]"
              style={{ background: "linear-gradient(145deg, #F7967A 0%, #E8A5E0 100%)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-white/90">Prioritized</p>
                  <p className="text-[12px] font-semibold text-white/90">tasks</p>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.22)" }}>
                  <Icon name="clock" size={14} className="text-white" />
                </div>
              </div>
              <div>
                <p className="text-[52px] font-bold text-white leading-none">{donePct}%</p>
                <p className="text-[12px] text-white/75 mt-1.5">Avg. Completed</p>
              </div>
            </div>

            {/* Gradient card: in progress */}
            <div
              className="rounded-[18px] p-5 flex flex-col justify-between min-h-[190px]"
              style={{ background: "linear-gradient(145deg, #A8EDEA 0%, #56CCF2 50%, #2193B0 100%)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-white/90">Additional</p>
                  <p className="text-[12px] font-semibold text-white/90">tasks</p>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.22)" }}>
                  <Icon name="check-circle" size={14} className="text-white" />
                </div>
              </div>
              <div>
                <p className="text-[52px] font-bold text-white leading-none">{inProgress.length}</p>
                <p className="text-[12px] text-white/75 mt-1.5">In Progress</p>
              </div>
            </div>
          </div>

          {/* Quick access — "Trackers connected" style */}
          <div
            className="rounded-[18px] px-5 py-4 flex items-center gap-4 flex-wrap"
            style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Quick access</p>
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                {activeProjects.length} active connections
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[
                { href: "/finance", icon: "wallet" as const, color: "#5DB872", bg: "rgba(93,184,114,0.12)", label: "Finance" },
                { href: "/invoice", icon: "receipt" as const, color: "#E8A55A", bg: "rgba(232,165,90,0.12)", label: "Invoice" },
                { href: "/moodboard", icon: "image" as const, color: "#7C6AE8", bg: "rgba(124,106,232,0.12)", label: "Moodboard" },
                { href: "/todo", icon: "check-square" as const, color: "#2A9D8F", bg: "rgba(42,157,143,0.12)", label: "Todo" },
              ].map(({ href, icon, color, bg, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-75"
                  style={{ background: bg }}
                  title={label}
                >
                  <Icon name={icon} size={15} style={{ color }} />
                </Link>
              ))}
              <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-canvas)", color: "var(--color-muted-soft)" }}>
                <Icon name="more-vertical" size={14} />
              </button>
            </div>
          </div>

          {/* Finance mini — "Focusing" analytics style */}
          <div
            className="rounded-[18px] p-5"
            style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[15px] font-bold" style={{ color: "var(--color-ink)" }}>Keuangan</p>
                <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Ringkasan bulan ini</p>
              </div>
              <Link
                href="/finance"
                className="flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-75"
                style={{ background: "rgba(42,157,143,0.10)", color: "#2A9D8F" }}
              >
                Detail <Icon name="arrow-right" size={11} />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <FinKpi label="Pemasukan" value={fmtIDR(income)} color="#5DB872" />
              <FinKpi label="Pengeluaran" value={fmtIDR(expense)} color="#D85A4A" />
              <FinKpi label="Savings" value={`${savingsRate}%`} color={savingsRate >= 20 ? "#2A9D8F" : "#E8A55A"} />
            </div>

            {/* Bar comparison */}
            <div className="space-y-2.5">
              <FinBar label="Income" value={income} max={maxFin} color="#5DB872" fmtVal={fmtIDR(income)} />
              <FinBar label="Expense" value={expense} max={maxFin} color="#D85A4A" fmtVal={fmtIDR(expense)} />
            </div>

            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: "1px solid var(--color-hairline)" }}>
              <span className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Saldo bersih</span>
              <span className="text-[18px] font-bold" style={{ color: balance >= 0 ? "#2A9D8F" : "#D85A4A" }}>
                {fmtIDR(balance)}
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (sticky, like "My meetings + Developed areas") ── */}
        <div
          className="hidden lg:flex flex-col gap-0 flex-shrink-0 sticky top-0 rounded-[20px] overflow-hidden"
          style={{
            width: 300,
            background: "var(--color-surface-card)",
            border: "1px solid var(--color-hairline)",
            maxHeight: "calc(100vh - 80px)",
          }}
        >
          {/* Upcoming tasks — "My meetings" style */}
          <div className="flex-1 overflow-auto">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between sticky top-0" style={{ background: "var(--color-surface-card)" }}>
              <div>
                <p className="text-[15px] font-bold" style={{ color: "var(--color-ink)" }}>Tugas Mendatang</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{openTasks.length} tugas terbuka</p>
              </div>
              <Link
                href="/todo/all"
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--color-canvas)]"
                style={{ color: "var(--color-muted-soft)", border: "1px solid var(--color-hairline)" }}
              >
                <Icon name="arrow-right" size={13} />
              </Link>
            </div>

            <div className="px-4 pb-4 flex flex-col gap-0">
              {upcoming.length === 0 ? (
                <p className="text-center py-8 text-[12px]" style={{ color: "var(--color-muted-soft)" }}>Semua tugas selesai 🎉</p>
              ) : (
                upcoming.map((task, i) => {
                  const dl = task.deadline ? new Date(task.deadline + "T00:00:00") : null;
                  const overdue = dl ? isPast(dl) && !isToday(dl) : false;
                  const pColor = projectColor(task.projectId);
                  return (
                    <Link
                      key={task.id}
                      href="/todo"
                      className="flex items-start gap-3 py-3 transition-colors hover:bg-[var(--color-canvas)] rounded-xl px-2 -mx-2"
                      style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
                    >
                      {/* Date column */}
                      <div className="flex-shrink-0 w-12 text-right">
                        {dl ? (
                          <>
                            <p className="text-[10px] font-semibold" style={{ color: "var(--color-muted-soft)" }}>
                              {format(dl, "d MMM")}
                            </p>
                            <p
                              className="text-[11px] font-bold"
                              style={{ color: overdue ? "#D85A4A" : "var(--color-muted)" }}
                            >
                              {overdue ? "Late" : format(dl, "EEE")}
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px]" style={{ color: "var(--color-muted-soft)" }}>—</p>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: "var(--color-ink)" }}>
                          {task.title}
                        </p>
                        <span
                          className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                          style={{ background: `${pColor}18`, color: pColor }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: pColor }} />
                          {projectName(task.projectId)}
                        </span>
                      </div>

                      {/* Priority dot */}
                      <span
                        className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                        style={{ background: PRIORITY_COLOR[task.priority] }}
                      />
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--color-hairline)" }} />

          {/* Projects — "Developed areas" style */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[15px] font-bold" style={{ color: "var(--color-ink)" }}>Projects</p>
                <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Progress overview</p>
              </div>
              <Link
                href="/todo"
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--color-canvas)]"
                style={{ color: "var(--color-muted-soft)", border: "1px solid var(--color-hairline)" }}
              >
                <Icon name="arrow-right" size={13} />
              </Link>
            </div>

            <div className="flex flex-col gap-3.5">
              {activeProjects.length === 0 ? (
                <p className="text-[12px] text-center py-4" style={{ color: "var(--color-muted-soft)" }}>Belum ada project aktif.</p>
              ) : (
                activeProjects.map((project) => {
                  const projTasks = tasks.filter((t) => t.projectId === project.id);
                  const doneCount = projTasks.filter((t) => t.status === "done").length;
                  const pct = projTasks.length > 0 ? Math.round((doneCount / projTasks.length) * 100) : 0;
                  return (
                    <div key={project.id} className="flex items-center gap-3">
                      <p className="text-[12px] font-semibold truncate flex-1 min-w-0" style={{ color: "var(--color-ink)" }}>
                        {project.name}
                      </p>
                      {/* Progress bar */}
                      <div className="flex-shrink-0 w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-hairline)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: project.color }} />
                      </div>
                      <span className="text-[11px] font-bold w-8 text-right flex-shrink-0" style={{ color: "var(--color-muted)" }}>
                        {pct}%
                      </span>
                      {/* Action dot */}
                      <Link
                        href={`/todo/${project.id}`}
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-75"
                        style={{ background: `${project.color}22` }}
                      >
                        <Icon name="arrow-right" size={10} style={{ color: project.color }} />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </ShellLayout>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Pill({ icon, value, color, bg, label }: { icon: "folder" | "list-check" | "check-circle"; value: number; color: string; bg: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 text-[13px] font-bold" style={{ color }}>
        <Icon name={icon} size={11} />
        {value}
      </div>
      <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-muted-soft)" }}>{label}</p>
    </div>
  );
}

function FinKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[12px] p-3" style={{ background: `${color}0f` }}>
      <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: `${color}cc` }}>{label}</p>
      <p className="text-[12px] font-bold leading-tight truncate" style={{ color }}>{value}</p>
    </div>
  );
}

function FinBar({ label, value, max, color, fmtVal }: { label: string; value: number; max: number; color: string; fmtVal: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-medium w-14 flex-shrink-0" style={{ color: "var(--color-muted)" }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-hairline)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className="text-[11px] font-semibold w-24 text-right flex-shrink-0" style={{ color }}>{fmtVal}</span>
    </div>
  );
}
