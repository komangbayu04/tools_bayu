"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import {
  FileText,
  Image,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckSquare,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTaskStore } from "@/lib/store";
import { useMoodStore } from "@/lib/store";

const recentDocs = [
  { id: 1, title: "INV-2024-047 — Archetype Studio", type: "Invoice", date: "2026-06-12" },
  { id: 2, title: "INV-2024-046 — Morphic Lab", type: "Invoice", date: "2026-06-10" },
  { id: 3, title: "Project Proposal — Neon Collective", type: "Proposal", date: "2026-06-08" },
];

export default function DashboardPage() {
  const today = new Date();
  const formattedDate = format(today, "EEEE, MMMM d");
  const { tasks } = useTaskStore();
  const { items: moodItems } = useMoodStore();

  const highPriorityTasks = tasks.filter((t) => t.priority === "high" && t.status === "todo");
  const todoPending = tasks.filter((t) => t.status === "todo");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const moodPreviews = moodItems.slice(0, 5);

  return (
    <ShellLayout>
      {/* Header */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <p className="text-sm text-[#7A9099] font-medium mb-1">{formattedDate}</p>
        <h1 className="text-[52px] font-semibold text-[#1C4F4F] dark:text-[#E8F0F2] tracking-tight leading-tight">
          Good morning, Bayu.
        </h1>
        <p className="text-[#7A9099] mt-2 text-base">
          Here&apos;s what&apos;s on your plate today.
        </p>
      </motion.div>

      {/* Stat Pills Row */}
      <motion.div
        className="flex gap-4 mb-8 flex-wrap"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.2 }}
      >
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-50 dark:bg-[#2D1818] border border-red-100 dark:border-[#4A2020]">
          <AlertCircle size={16} className="text-[#C64545]" />
          <div>
            <span className="text-2xl font-bold text-[#C64545]">{highPriorityTasks.length}</span>
            <span className="text-xs text-[#C64545]/70 font-medium ml-1.5">high priority</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#E6F4F2] dark:bg-[#0D2E2C] border border-[#C0E4E0] dark:border-[#1C4040]">
          <CheckSquare size={16} className="text-[#2A9D8F]" />
          <div>
            <span className="text-2xl font-bold text-[#2A9D8F]">{todoPending.length}</span>
            <span className="text-xs text-[#2A9D8F]/70 font-medium ml-1.5">open tasks</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#F4F6F7] dark:bg-[#1E2B30] border border-[#E5E9EB] dark:border-[#2D3F47]">
          <CheckSquare size={16} className="text-[#5DB872]" />
          <div>
            <span className="text-2xl font-bold text-[#5DB872]">{doneTasks.length}</span>
            <span className="text-xs text-[#5DB872]/70 font-medium ml-1.5">done</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#F4F6F7] dark:bg-[#1E2B30] border border-[#E5E9EB] dark:border-[#2D3F47]">
          <Image size={16} className="text-purple-500" />
          <div>
            <span className="text-2xl font-bold text-[#1C4F4F] dark:text-[#E8F0F2]">{moodItems.length}</span>
            <span className="text-xs text-[#7A9099] font-medium ml-1.5">moodboard refs</span>
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* High Priority Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                  <AlertCircle size={15} className="text-[#C64545]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A2B32] dark:text-[#E8F0F2]">High Priority</p>
                  <p className="text-xs text-[#7A9099]">{highPriorityTasks.length} tasks due soon</p>
                </div>
              </div>
              <Link href="/todo" className="text-xs text-[#2A9D8F] font-semibold flex items-center gap-1 hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {highPriorityTasks.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-[#A8BDC3]">All clear!</div>
              ) : (
                <div className="divide-y divide-[#F4F6F7] dark:divide-[#2D3F47]">
                  {highPriorityTasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-[#FAFBFB] dark:hover:bg-[#243035] transition-colors">
                      <div className="w-4 h-4 rounded border-2 border-[#E5E9EB] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A2B32] dark:text-[#E8F0F2] truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[#7A9099]">{task.project}</span>
                          {task.due && (
                            <>
                              <span className="text-[#E5E9EB]">·</span>
                              <Clock size={11} className="text-[#A8BDC3]" />
                              <span className="text-xs text-[#A8BDC3]">{task.due}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-[#C64545]">
                        high
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Documents */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.2 }}
        >
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E6F4F2] flex items-center justify-center">
                  <FileText size={15} className="text-[#2A9D8F]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A2B32] dark:text-[#E8F0F2]">Recent Documents</p>
                  <p className="text-xs text-[#7A9099]">Invoices & proposals</p>
                </div>
              </div>
              <Link href="/invoice" className="text-xs text-[#2A9D8F] font-semibold flex items-center gap-1 hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#F4F6F7] dark:divide-[#2D3F47]">
                {recentDocs.map((doc) => (
                  <div key={doc.id} className="px-6 py-4 flex items-center gap-3 hover:bg-[#FAFBFB] dark:hover:bg-[#243035] transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-[#E6F4F2] flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-[#2A9D8F]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A2B32] dark:text-[#E8F0F2] truncate">{doc.title}</p>
                      <p className="text-xs text-[#7A9099] mt-0.5">{format(new Date(doc.date), "MMM d, yyyy")}</p>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#E6F4F2] text-[#2A9D8F]">
                      {doc.type}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Moodboard Strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.2 }}
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                <Image size={15} className="text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A2B32] dark:text-[#E8F0F2]">Recent Moodboard</p>
                <p className="text-xs text-[#7A9099]">{moodItems.length} references saved</p>
              </div>
            </div>
            <Link href="/moodboard" className="text-xs text-[#2A9D8F] font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {moodPreviews.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                  className="flex-1 h-24 rounded-xl overflow-hidden flex items-end p-2"
                  style={{ backgroundColor: item.color }}
                >
                  <span className="text-xs font-semibold text-white/80 truncate drop-shadow">{item.title}</span>
                </motion.div>
              ))}
              {moodPreviews.length === 0 && (
                <div className="flex-1 text-center py-6 text-sm text-[#A8BDC3]">No references yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </ShellLayout>
  );
}
