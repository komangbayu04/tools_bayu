"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { format, isPast, isToday } from "date-fns";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  useTaskStore,
  useMoodStore,
  useProjectStore,
  useFinanceStore,
  useInvoiceHistoryStore,
  type Priority,
} from "@/lib/store";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, delay },
});

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const priorityVariant: Record<Priority, "high" | "medium" | "low"> = {
  high: "high",
  medium: "medium",
  low: "low",
};

export default function DashboardPage() {
  const today = new Date();
  const currentMonth = format(today, "yyyy-MM");

  const { tasks } = useTaskStore();
  const { items: moodItems } = useMoodStore();
  const { projects } = useProjectStore();
  const { transactions } = useFinanceStore();
  const { history } = useInvoiceHistoryStore();

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const projectColor = (id: string) => projects.find((p) => p.id === id)?.color ?? "#2A9D8F";

  // ── Task metrics ──
  const openTasks = tasks.filter((t) => t.status !== "done");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const completed = tasks.filter((t) => t.status === "done");
  const highPriorityOpen = openTasks.filter((t) => t.priority === "high");
  const activeProjects = projects.filter((p) => p.status === "active");

  // ── Finance metrics (this month) ──
  const monthTx = transactions.filter((t) => t.month === currentMonth);
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
  const maxFin = Math.max(income, expense, 1);

  // ── Upcoming tasks ──
  const upcoming = [...openTasks]
    .sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    })
    .slice(0, 7);

  // ── Completion % ──
  const donePct = Math.round((completed.length / Math.max(1, tasks.length)) * 100);

  // suppress unused var warning – history is kept for data connections
  void history;
  void moodItems;
  void highPriorityOpen;

  return (
    <ShellLayout>
      {/* ── Welcome header ── */}
      <motion.div className="mb-8" {...fade(0)}>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--color-muted)" }}>
          {format(today, "EEEE, d MMMM yyyy")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-ink)" }}>
          Selamat datang, Bayu 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          {format(today, "MMMM yyyy")} — {tasks.length} tugas total · {activeProjects.length} project aktif · saldo {fmtIDR(balance)}
        </p>
      </motion.div>

      {/* ── Row 1: Profile card + 2 gradient task cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_1.4fr] gap-5 mb-5">
        {/* Profile card */}
        <motion.div {...fade(0.06)}>
          <Card className="rounded-[20px] h-full flex flex-col items-center justify-center text-center py-8 px-6">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #2A9D8F 0%, #1C4F4F 100%)" }}
            >
              BK
            </div>
            <p className="text-base font-bold leading-tight" style={{ color: "var(--color-ink)" }}>
              Bayu Krisnayana
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
              Graphic Designer
            </p>

            {/* Stat pills */}
            <div className="flex items-center gap-2 mt-5 flex-wrap justify-center">
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "rgba(28,79,79,0.08)", color: "#1C4F4F" }}
              >
                <Icon name="folder" size={12} />
                {activeProjects.length}
              </div>
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "rgba(42,157,143,0.09)", color: "#2A9D8F" }}
              >
                <Icon name="list-check" size={12} />
                {openTasks.length}
              </div>
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "rgba(93,184,114,0.10)", color: "#5DB872" }}
              >
                <Icon name="check-circle" size={12} />
                {completed.length}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Gradient card 1: Prioritized Tasks */}
        <motion.div {...fade(0.10)}>
          <div
            className="rounded-[20px] p-7 h-full flex flex-col justify-between min-h-[180px]"
            style={{ background: "linear-gradient(135deg, #F7967A 0%, #E8A5E0 100%)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/90">Prioritized Tasks</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.20)" }}>
                <Icon name="clock" size={16} className="text-white" />
              </div>
            </div>
            <div>
              <p className="text-6xl font-bold text-white leading-none">{donePct}%</p>
              <p className="text-sm text-white/80 mt-2">Avg. Completed</p>
            </div>
          </div>
        </motion.div>

        {/* Gradient card 2: In Progress */}
        <motion.div {...fade(0.14)}>
          <div
            className="rounded-[20px] p-7 h-full flex flex-col justify-between min-h-[180px]"
            style={{ background: "linear-gradient(135deg, #6DD5ED 0%, #2193B0 100%)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/90">In Progress</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.20)" }}>
                <Icon name="circle-dot" size={16} className="text-white" />
              </div>
            </div>
            <div>
              <p className="text-6xl font-bold text-white leading-none">{inProgress.length}</p>
              <p className="text-sm text-white/80 mt-2">Tasks Active</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Quick links row ── */}
      <motion.div className="mb-5" {...fade(0.18)}>
        <Card className="rounded-[20px]">
          <CardContent className="py-4 px-6">
            <div className="flex items-center gap-4 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: "var(--color-muted)" }}>
                Quick access
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { href: "/finance", icon: "wallet" as const, label: "Finance", color: "#5DB872", bg: "rgba(93,184,114,0.10)" },
                  { href: "/invoice", icon: "receipt" as const, label: "Invoice", color: "#E8A55A", bg: "rgba(232,165,90,0.10)" },
                  { href: "/moodboard", icon: "image" as const, label: "Moodboard", color: "#7C6AE8", bg: "rgba(124,106,232,0.09)" },
                ].map(({ href, icon, label, color, bg }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-75"
                    style={{ background: bg, color }}
                  >
                    <Icon name={icon} size={14} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Row 2: Upcoming tasks (60%) + Right column (40%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        {/* Upcoming tasks */}
        <motion.div {...fade(0.22)}>
          <Card className="rounded-[20px] overflow-hidden h-full">
            <CardHeader>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-primary-light)" }}>
                  <Icon name="clock" size={15} style={{ color: "#2A9D8F" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>
                    Tugas Mendatang
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                    {openTasks.length} tugas terbuka
                  </p>
                </div>
                <span
                  className="ml-1 flex-shrink-0 text-[11px] font-bold rounded-full px-2 py-0.5"
                  style={{ background: "rgba(42,157,143,0.10)", color: "#2A9D8F" }}
                >
                  {upcoming.length}
                </span>
              </div>
              <Link
                href="/todo"
                className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity flex-shrink-0"
                style={{ color: "#2A9D8F" }}
              >
                Lihat semua <Icon name="arrow-right" size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {upcoming.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>
                    Semua tugas selesai.
                  </p>
                </div>
              ) : (
                upcoming.map((task, i) => {
                  const dl = task.deadline ? new Date(task.deadline) : null;
                  const overdue = dl ? isPast(dl) && !isToday(dl) : false;
                  const pColor = projectColor(task.projectId);
                  return (
                    <Link
                      key={task.id}
                      href="/todo"
                      className="px-5 py-4 flex items-center gap-3 transition-colors hover:bg-[var(--color-canvas)]"
                      style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
                    >
                      {/* Colored dot */}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: pColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-ink)" }}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span
                            className="text-[11px] rounded-full px-2 py-0.5 font-medium"
                            style={{ background: `${pColor}18`, color: pColor }}
                          >
                            {projectName(task.projectId)}
                          </span>
                          {dl && (
                            <span
                              className="text-[11px] font-medium"
                              style={{ color: overdue ? "#D85A4A" : "var(--color-muted-soft)" }}
                            >
                              {overdue ? "Telat · " : ""}{format(dl, "d MMM")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right column: Finance mini + Projects */}
        <div className="flex flex-col gap-5">
          {/* Finance mini */}
          <motion.div {...fade(0.26)}>
            <Card className="rounded-[20px] overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(93,184,114,0.10)" }}
                  >
                    <Icon name="wallet" size={15} style={{ color: "#5DB872" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>
                      Keuangan Bulan Ini
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                      Savings rate {savingsRate}%
                    </p>
                  </div>
                </div>
                <Link
                  href="/finance"
                  className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity flex-shrink-0"
                  style={{ color: "#2A9D8F" }}
                >
                  Detail <Icon name="arrow-right" size={12} />
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Income</span>
                    <span className="text-[12px] font-semibold" style={{ color: "#5DB872" }}>{fmtIDR(income)}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-hairline)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(income / maxFin) * 100}%`, background: "#5DB872" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Expense</span>
                    <span className="text-[12px] font-semibold" style={{ color: "#D85A4A" }}>{fmtIDR(expense)}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-hairline)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(expense / maxFin) * 100}%`, background: "#D85A4A" }} />
                  </div>
                </div>
                <div className="pt-3 flex items-center justify-between border-t" style={{ borderColor: "var(--color-hairline)" }}>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Saldo</span>
                  <span className="text-[15px] font-bold" style={{ color: balance >= 0 ? "#2A9D8F" : "#D85A4A" }}>
                    {fmtIDR(balance)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Projects list */}
          <motion.div {...fade(0.30)} className="flex-1">
            <Card className="rounded-[20px] overflow-hidden h-full">
              <CardHeader>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(28,79,79,0.08)" }}
                  >
                    <Icon name="folder" size={15} style={{ color: "#1C4F4F" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>Projects</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                      {activeProjects.length} project aktif
                    </p>
                  </div>
                </div>
                <Link
                  href="/todo"
                  className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity flex-shrink-0"
                  style={{ color: "#2A9D8F" }}
                >
                  Lihat semua <Icon name="arrow-right" size={12} />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {activeProjects.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>
                      Belum ada project aktif.
                    </p>
                  </div>
                ) : (
                  activeProjects.map((project, i) => {
                    const projTasks = tasks.filter((t) => t.projectId === project.id);
                    const doneCount = projTasks.filter((t) => t.status === "done").length;
                    const pct = projTasks.length > 0 ? Math.round((doneCount / projTasks.length) * 100) : 0;
                    return (
                      <Link
                        key={project.id}
                        href="/todo"
                        className="block px-5 py-3.5 transition-colors hover:bg-[var(--color-canvas)]"
                        style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
                          <p className="text-[13px] font-medium truncate flex-1" style={{ color: "var(--color-ink)" }}>
                            {project.name}
                          </p>
                          <span className="text-[11px] flex-shrink-0" style={{ color: "var(--color-muted)" }}>
                            {doneCount}/{projTasks.length}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-hairline)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: project.color }}
                          />
                        </div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </ShellLayout>
  );
}
