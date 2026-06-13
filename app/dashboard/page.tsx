"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText, Layers, ArrowRight, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTaskStore, useMoodStore } from "@/lib/store";
import { resolveCover } from "@/lib/utils";

const recentDocs = [
  { id: 1, number: "INV-2026-047", client: "Archetype Studio", type: "Invoice", date: "2026-06-12", amount: "Rp 12.500.000" },
  { id: 2, number: "INV-2026-046", client: "Morphic Lab", type: "Invoice", date: "2026-06-10", amount: "Rp 8.750.000" },
  { id: 3, number: "QUO-2026-012", client: "Neon Collective", type: "Quotation", date: "2026-06-08", amount: "Rp 22.000.000" },
];

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, delay },
});

export default function DashboardPage() {
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const { tasks } = useTaskStore();
  const { items: moodItems } = useMoodStore();

  const highPriorityTasks = tasks.filter((t) => t.priority === "high" && t.status === "todo");
  const todoPending = tasks.filter((t) => t.status === "todo");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const moodPreviews = moodItems.slice(0, 4);

  const stats = [
    { label: "High priority", value: highPriorityTasks.length, color: "#C64545", bg: "rgba(198,69,69,0.08)", icon: <AlertCircle size={16} /> },
    { label: "Open tasks", value: todoPending.length, color: "#2A9D8F", bg: "rgba(42,157,143,0.09)", icon: <CheckCircle2 size={16} /> },
    { label: "Completed", value: doneTasks.length, color: "#5DB872", bg: "rgba(93,184,114,0.10)", icon: <CheckCircle2 size={16} /> },
    { label: "Moodboard refs", value: moodItems.length, color: "#7C6AE8", bg: "rgba(124,106,232,0.09)", icon: <Layers size={16} /> },
  ];

  return (
    <ShellLayout>
      <PageHeader
        eyebrow={format(today, "EEEE, MMMM d, yyyy")}
        title={`${greeting}, Bayu.`}
        subtitle="Here's what's on your plate today."
      />

      {/* Stats */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" {...fade(0.06)}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[14px] px-4 py-4 flex items-center gap-3.5 border"
            style={{ background: stat.bg, borderColor: "transparent" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-surface)", color: stat.color }}
            >
              {stat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[26px] font-bold leading-none" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-[12px] font-medium mt-1 truncate" style={{ color: stat.color, opacity: 0.75 }}>
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Two-column cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* High priority */}
        <motion.div {...fade(0.12)}>
          <Card className="overflow-hidden h-full">
            <CardHeader>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(198,69,69,0.09)" }}>
                  <AlertCircle size={15} style={{ color: "#C64545" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>High Priority</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                    {highPriorityTasks.length} task{highPriorityTasks.length !== 1 ? "s" : ""} pending
                  </p>
                </div>
              </div>
              <Link href="/todo" className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: "#2A9D8F" }}>
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {highPriorityTasks.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>All clear — nothing urgent.</p>
                </div>
              ) : (
                highPriorityTasks.slice(0, 4).map((task, i) => (
                  <div
                    key={task.id}
                    className="px-5 py-3.5 flex items-center gap-3 transition-colors hover:bg-[var(--color-canvas)]"
                    style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
                  >
                    <div className="w-[18px] h-[18px] rounded-md flex-shrink-0" style={{ border: "2px solid var(--color-hairline)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-ink)" }}>{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>{task.project}</span>
                        {task.due && (
                          <>
                            <span style={{ color: "var(--color-hairline)" }}>·</span>
                            <Clock size={10} style={{ color: "var(--color-muted-soft)" }} />
                            <span className="text-[11px] flex-shrink-0" style={{ color: "var(--color-muted-soft)" }}>{task.due}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="high">high</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent documents */}
        <motion.div {...fade(0.16)}>
          <Card className="overflow-hidden h-full">
            <CardHeader>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-primary-light)" }}>
                  <FileText size={15} style={{ color: "#2A9D8F" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>Recent Documents</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>Invoices & quotations</p>
                </div>
              </div>
              <Link href="/invoice" className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: "#2A9D8F" }}>
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentDocs.map((doc, i) => (
                <div
                  key={doc.id}
                  className="px-5 py-3.5 flex items-center gap-3 transition-colors hover:bg-[var(--color-canvas)] cursor-pointer"
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-primary-light)" }}>
                    <FileText size={15} style={{ color: "#2A9D8F" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>{doc.number}</p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--color-muted)" }}>
                      {doc.client} · {format(new Date(doc.date), "MMM d")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[12px] font-semibold whitespace-nowrap" style={{ color: "var(--color-ink)" }}>{doc.amount}</p>
                    <Badge variant={doc.type === "Invoice" ? "teal" : "gray"} className="mt-1">{doc.type}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Moodboard strip */}
      <motion.div {...fade(0.2)}>
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,106,232,0.09)" }}>
                <Layers size={15} style={{ color: "#7C6AE8" }} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>Recent Moodboard</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{moodItems.length} references saved</p>
              </div>
            </div>
            <Link href="/moodboard" className="text-[12px] font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: "#2A9D8F" }}>
              View all <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent>
            {moodPreviews.length === 0 ? (
              <p className="text-sm py-4" style={{ color: "var(--color-muted-soft)" }}>No references yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {moodPreviews.map((item, i) => (
                  <motion.a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.22 + i * 0.05 }}
                    className="h-28 rounded-[12px] overflow-hidden relative group block"
                  >
                    <div
                      className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                      style={{ background: resolveCover(item.color, item.id) }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/0 flex items-end p-2.5">
                      <span className="text-[11px] font-semibold text-white truncate drop-shadow">{item.title}</span>
                    </div>
                  </motion.a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </ShellLayout>
  );
}
