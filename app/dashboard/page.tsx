"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
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
import { resolveCover } from "@/lib/utils";

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
    .slice(0, 5);

  // ── Recent moodboard ──
  const moodPreviews = [...moodItems]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  const stats: {
    label: string;
    value: string | number;
    icon: IconName;
    color: string;
    bg: string;
  }[] = [
    { label: "Open tasks", value: openTasks.length, icon: "list-check", color: "#2A9D8F", bg: "rgba(42,157,143,0.09)" },
    { label: "In progress", value: inProgress.length, icon: "circle-dot", color: "#6D8DF0", bg: "rgba(109,141,240,0.10)" },
    { label: "Completed", value: completed.length, icon: "check-circle", color: "#5DB872", bg: "rgba(93,184,114,0.10)" },
    { label: "High priority", value: highPriorityOpen.length, icon: "alert-triangle", color: "#D85A4A", bg: "rgba(216,90,74,0.09)" },
    { label: "Active projects", value: activeProjects.length, icon: "folder-open", color: "#1C4F4F", bg: "rgba(28,79,79,0.08)" },
    { label: "Income bulan ini", value: fmtIDR(income), icon: "trending-up", color: "#5DB872", bg: "rgba(93,184,114,0.10)" },
    { label: "Expense bulan ini", value: fmtIDR(expense), icon: "trending-down", color: "#D85A4A", bg: "rgba(216,90,74,0.09)" },
    { label: "Saldo bulan ini", value: fmtIDR(balance), icon: "wallet", color: balance >= 0 ? "#2A9D8F" : "#D85A4A", bg: "rgba(42,157,143,0.09)" },
    { label: "Moodboard refs", value: moodItems.length, icon: "image", color: "#7C6AE8", bg: "rgba(124,106,232,0.09)" },
    { label: "Saved documents", value: history.length, icon: "receipt", color: "#E8A55A", bg: "rgba(232,165,90,0.10)" },
  ];

  return (
    <ShellLayout>
      <PageHeader
        eyebrow={format(today, "EEEE, MMMM d, yyyy")}
        title="Dashboard"
        subtitle={`Ringkasan aktivitas Anda — ${format(today, "MMMM yyyy")}.`}
      />

      {/* KPI Stats */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6" {...fade(0.06)}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[14px] px-4 py-4 flex items-center gap-3 border border-transparent"
            style={{ background: stat.bg }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-surface)", color: stat.color }}
            >
              <Icon name={stat.icon} size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-bold leading-tight truncate" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-[11px] font-medium mt-0.5 truncate" style={{ color: stat.color, opacity: 0.75 }}>
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Two-column: Upcoming tasks + Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Upcoming tasks */}
        <motion.div {...fade(0.12)}>
          <Card className="overflow-hidden h-full">
            <CardHeader>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-primary-light)" }}>
                  <Icon name="clock" size={15} style={{ color: "#2A9D8F" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>Tugas Mendatang</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                    {openTasks.length} tugas terbuka
                  </p>
                </div>
              </div>
              <Link href="/todo" className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: "#2A9D8F" }}>
                Lihat semua <Icon name="arrow-right" size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {upcoming.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>Semua tugas selesai.</p>
                </div>
              ) : (
                upcoming.map((task, i) => {
                  const dl = task.deadline ? new Date(task.deadline) : null;
                  const overdue = dl ? isPast(dl) && !isToday(dl) : false;
                  return (
                    <Link
                      key={task.id}
                      href="/todo"
                      className="px-5 py-3.5 flex items-center gap-3 transition-colors hover:bg-[var(--color-canvas)]"
                      style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-ink)" }}>{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>{projectName(task.projectId)}</span>
                          {dl && (
                            <>
                              <span style={{ color: "var(--color-hairline)" }}>·</span>
                              <span className="text-[11px] flex-shrink-0 font-medium" style={{ color: overdue ? "#D85A4A" : "var(--color-muted-soft)" }}>
                                {overdue ? "Telat " : ""}{format(dl, "MMM d")}
                              </span>
                            </>
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

        {/* Projects */}
        <motion.div {...fade(0.16)}>
          <Card className="overflow-hidden h-full">
            <CardHeader>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(28,79,79,0.08)" }}>
                  <Icon name="folder" size={15} style={{ color: "#1C4F4F" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>Projects</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{activeProjects.length} project aktif</p>
                </div>
              </div>
              <Link href="/todo" className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: "#2A9D8F" }}>
                Lihat semua <Icon name="arrow-right" size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {activeProjects.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>Belum ada project aktif.</p>
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
                        <p className="text-[13px] font-medium truncate flex-1" style={{ color: "var(--color-ink)" }}>{project.name}</p>
                        <span className="text-[11px] flex-shrink-0" style={{ color: "var(--color-muted)" }}>
                          {doneCount}/{projTasks.length}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-hairline)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: project.color }} />
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Finance + Moodboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Finance */}
        <motion.div {...fade(0.2)}>
          <Card className="overflow-hidden h-full">
            <CardHeader>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(93,184,114,0.10)" }}>
                  <Icon name="wallet" size={15} style={{ color: "#5DB872" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>Keuangan Bulan Ini</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>Savings rate {savingsRate}%</p>
                </div>
              </div>
              <Link href="/finance" className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: "#2A9D8F" }}>
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
                <span className="text-[15px] font-bold" style={{ color: balance >= 0 ? "#2A9D8F" : "#D85A4A" }}>{fmtIDR(balance)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Moodboard strip */}
        <motion.div className="lg:col-span-2" {...fade(0.24)}>
          <Card className="overflow-hidden h-full">
            <CardHeader>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,106,232,0.09)" }}>
                  <Icon name="image" size={15} style={{ color: "#7C6AE8" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>Moodboard Terbaru</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{moodItems.length} referensi tersimpan</p>
                </div>
              </div>
              <Link href="/moodboard" className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: "#2A9D8F" }}>
                Lihat semua <Icon name="arrow-right" size={12} />
              </Link>
            </CardHeader>
            <CardContent>
              {moodPreviews.length === 0 ? (
                <p className="text-sm py-4" style={{ color: "var(--color-muted-soft)" }}>Belum ada referensi.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {moodPreviews.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.26 + i * 0.04 }}
                    >
                      <Link
                        href="/moodboard"
                        className="h-24 rounded-[12px] overflow-hidden relative group block"
                      >
                        <div
                          className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                          style={{ background: resolveCover(item.image_url ?? item.color, item.id) }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/0 flex items-end p-2">
                          <span className="text-[10px] font-semibold text-white truncate drop-shadow">{item.title}</span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ShellLayout>
  );
}
