"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import {
  CheckSquare,
  FileText,
  Image,
  ArrowRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

const highPriorityTasks = [
  {
    id: 1,
    title: "Finalize Q3 brand identity proposal",
    project: "Brand Revamp",
    dueDate: "2026-06-14",
    priority: "high" as const,
  },
  {
    id: 2,
    title: "Review motion design storyboard",
    project: "Motion Reel",
    dueDate: "2026-06-15",
    priority: "high" as const,
  },
  {
    id: 3,
    title: "Send invoice to Archetype Studio",
    project: "Client Billing",
    dueDate: "2026-06-13",
    priority: "high" as const,
  },
];

const recentDocs = [
  { id: 1, title: "INV-2024-047 — Archetype Studio", type: "Invoice", date: "2026-06-12" },
  { id: 2, title: "INV-2024-046 — Morphic Lab", type: "Invoice", date: "2026-06-10" },
  { id: 3, title: "Project Proposal — Neon Collective", type: "Proposal", date: "2026-06-08" },
];

const moodboardPreviews = [
  { id: 1, color: "#C084FC", label: "Purple Glass" },
  { id: 2, color: "#6EE7B7", label: "Mint Texture" },
  { id: 3, color: "#FCA5A5", label: "Warm Coral" },
  { id: 4, color: "#93C5FD", label: "Sky Gradient" },
  { id: 5, color: "#FDE68A", label: "Golden Hour" },
];

export default function DashboardPage() {
  const today = new Date();
  const formattedDate = format(today, "EEEE, MMMM d");

  return (
    <ShellLayout>
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm text-[#7A9099] font-medium mb-1">{formattedDate}</p>
        <h1 className="text-[52px] font-semibold text-[#1C4F4F] tracking-tight leading-tight">
          Good morning, Bayu.
        </h1>
        <p className="text-[#7A9099] mt-2 text-base">
          Here&apos;s what&apos;s on your plate today.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-[#F4F6F7] border border-[#E5E9EB] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-[#C64545]" />
            <span className="text-xs font-semibold text-[#7A9099] uppercase tracking-wide">High Priority</span>
          </div>
          <p className="text-3xl font-bold text-[#1C4F4F]">3</p>
          <p className="text-sm text-[#7A9099] mt-1">tasks due soon</p>
        </div>
        <div className="rounded-2xl bg-[#F4F6F7] border border-[#E5E9EB] p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-[#2A9D8F]" />
            <span className="text-xs font-semibold text-[#7A9099] uppercase tracking-wide">Documents</span>
          </div>
          <p className="text-3xl font-bold text-[#1C4F4F]">12</p>
          <p className="text-sm text-[#7A9099] mt-1">invoices total</p>
        </div>
        <div className="rounded-2xl bg-[#F4F6F7] border border-[#E5E9EB] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Image size={16} className="text-purple-500" />
            <span className="text-xs font-semibold text-[#7A9099] uppercase tracking-wide">Moodboard</span>
          </div>
          <p className="text-3xl font-bold text-[#1C4F4F]">28</p>
          <p className="text-sm text-[#7A9099] mt-1">references saved</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* High Priority Tasks */}
        <div className="rounded-2xl border border-[#E5E9EB] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E5E9EB]">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} className="text-[#2A9D8F]" />
              <h2 className="text-[16px] font-semibold text-[#1C4F4F]">High Priority Tasks</h2>
            </div>
            <Link href="/todo" className="text-xs text-[#2A9D8F] font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#F4F6F7]">
            {highPriorityTasks.map((task) => (
              <div key={task.id} className="px-6 py-4 flex items-center gap-3">
                <div className="w-4 h-4 rounded border-2 border-[#E5E9EB] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A2B32] truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#7A9099]">{task.project}</span>
                    <span className="text-[#E5E9EB]">·</span>
                    <Clock size={11} className="text-[#A8BDC3]" />
                    <span className="text-xs text-[#A8BDC3]">{format(new Date(task.dueDate), "MMM d")}</span>
                  </div>
                </div>
                <Badge variant="high">High</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="rounded-2xl border border-[#E5E9EB] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E5E9EB]">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#2A9D8F]" />
              <h2 className="text-[16px] font-semibold text-[#1C4F4F]">Recent Documents</h2>
            </div>
            <Link href="/invoice" className="text-xs text-[#2A9D8F] font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#F4F6F7]">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E6F4F2] flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-[#2A9D8F]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A2B32] truncate">{doc.title}</p>
                  <p className="text-xs text-[#7A9099] mt-0.5">{format(new Date(doc.date), "MMM d, yyyy")}</p>
                </div>
                <Badge variant="teal">{doc.type}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Moodboard Strip */}
      <div className="rounded-2xl border border-[#E5E9EB] bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E5E9EB]">
          <div className="flex items-center gap-2">
            <Image size={18} className="text-[#2A9D8F]" />
            <h2 className="text-[16px] font-semibold text-[#1C4F4F]">Recent Moodboard</h2>
          </div>
          <Link href="/moodboard" className="text-xs text-[#2A9D8F] font-semibold flex items-center gap-1 hover:underline">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="p-6">
          <div className="flex gap-3">
            {moodboardPreviews.map((item) => (
              <div
                key={item.id}
                className="flex-1 h-24 rounded-xl overflow-hidden flex items-end p-2"
                style={{ backgroundColor: item.color }}
              >
                <span className="text-xs font-semibold text-white/80 truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}
