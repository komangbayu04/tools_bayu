"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { useState } from "react";
import { Plus, Upload, Search, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Priority = "high" | "medium" | "low";
type Status = "todo" | "done";
type FilterTab = "all" | Priority | "done";

interface Task {
  id: string;
  title: string;
  project: string;
  priority: Priority;
  status: Status;
  due?: string;
  source: "manual" | "transcript";
}

const initialTasks: Task[] = [
  { id: "1", title: "Revisi cover slide deck Overclock ke light mode", project: "Overclock", priority: "high", status: "todo", due: "16 Jun", source: "transcript" },
  { id: "2", title: "Build reusable email template Bedford", project: "Bedford", priority: "high", status: "todo", due: "18 Jun", source: "manual" },
  { id: "3", title: "Finalize "The Current" newsletter revision", project: "Bedford", priority: "medium", status: "todo", source: "transcript" },
  { id: "4", title: "Update brand deck transition slides", project: "Overclock", priority: "medium", status: "todo", source: "transcript" },
  { id: "5", title: "Research competitor moodboards for Q3", project: "Internal", priority: "low", status: "todo", source: "manual" },
  { id: "6", title: "Send revised deck to Ahmed", project: "Overclock", priority: "high", status: "done", source: "transcript" },
];

const priorityMeta: Record<Priority, { label: string; dotColor: string; badgeBg: string; badgeText: string }> = {
  high: { label: "HIGH PRIORITY", dotColor: "bg-[#C64545]", badgeBg: "bg-red-50", badgeText: "text-[#C64545]" },
  medium: { label: "MEDIUM PRIORITY", dotColor: "bg-[#E8A55A]", badgeBg: "bg-amber-50", badgeText: "text-[#9A6020]" },
  low: { label: "LOW PRIORITY / SOMEDAY", dotColor: "bg-[#5DB872]", badgeBg: "bg-green-50", badgeText: "text-[#3D8B50]" },
};

interface ExtractedItem {
  task: string;
  priority: Priority;
  due_hint: string | null;
  context: string;
  selected: boolean;
}

export default function TodoPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [showImport, setShowImport] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [clientTag, setClientTag] = useState("Overclock");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedItem[] | null>(null);

  const toggleDone = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => t.id === id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t)
    );
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    setTasks((prev) => [...prev, {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      project: newProject.trim() || "General",
      priority: newPriority,
      status: "todo",
      source: "manual",
    }]);
    setNewTitle("");
    setNewProject("");
    setNewPriority("medium");
    setShowAddForm(false);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "done") return t.status === "done";
    if (filter !== "all") return t.priority === filter && t.status === "todo";
    return t.status === "todo";
  }).filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.project.toLowerCase().includes(search.toLowerCase()));

  const groupedByPriority = (["high", "medium", "low"] as Priority[]).map((p) => ({
    priority: p,
    tasks: filteredTasks.filter((t) => t.priority === p),
  })).filter((g) => g.tasks.length > 0);

  const doneTasks = filteredTasks.filter((t) => t.status === "done");

  const mockExtract = async () => {
    setExtracting(true);
    await new Promise((r) => setTimeout(r, 1800));
    setExtracted([
      { task: "Revisi cover slide ke light mode", priority: "high", due_hint: "by Friday", context: "Client requested lighter color scheme", selected: true },
      { task: `Kirim revised deck ke Ahmed`, priority: "high", due_hint: null, context: "Send after revisions done", selected: true },
      { task: "Update transition slides with new branding", priority: "medium", due_hint: "next week", context: "Consistency across all slides", selected: false },
      { task: "Konfirmasi jadwal review berikutnya", priority: "low", due_hint: null, context: "Schedule follow-up review meeting", selected: true },
    ]);
    setExtracting(false);
  };

  const toggleExtracted = (idx: number) => {
    setExtracted((prev) => prev ? prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e) : null);
  };

  const addExtracted = () => {
    if (!extracted) return;
    const newTasks = extracted.filter((e) => e.selected).map((e) => ({
      id: crypto.randomUUID(),
      title: e.task,
      project: clientTag,
      priority: e.priority,
      status: "todo" as Status,
      due: e.due_hint || undefined,
      source: "transcript" as const,
    }));
    setTasks((prev) => [...newTasks, ...prev]);
    setShowImport(false);
    setTranscript("");
    setExtracted(null);
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
    { key: "low", label: "Low" },
    { key: "done", label: "Done" },
  ];

  return (
    <ShellLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[42px] font-semibold text-[#1C4F4F] tracking-tight leading-tight">To do list</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] border border-[#E5E9EB] text-sm font-medium text-[#3D5159] hover:bg-[#F4F6F7] transition-colors"
          >
            <Upload size={15} /> Import Transcript
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#2A9D8F] text-white text-sm font-medium hover:bg-[#1E7268] transition-colors"
          >
            <Plus size={15} /> Add Task
          </button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center justify-between mb-6 border-b border-[#E5E9EB] pb-0">
        <div className="flex gap-0">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={clsx(
                "px-6 py-2.5 text-sm font-semibold rounded-t-[10px] transition-colors",
                filter === key
                  ? "bg-[#E0F0F0] text-[#1C4F4F]"
                  : "text-[#7A9099] hover:text-[#3D5159]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative mb-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8BDC3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="pl-8 pr-3 py-2 text-sm border border-[#E5E9EB] rounded-[8px] bg-[#F9FAFB] text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30 w-48"
          />
        </div>
      </div>

      {/* Add Task inline form */}
      {showAddForm && (
        <div className="mb-6 bg-[#F9FAFB] border border-[#E5E9EB] rounded-[14px] p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#7A9099] mb-1">Task</label>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setShowAddForm(false); }}
              placeholder="What needs to be done?"
              className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-[#7A9099] mb-1">Project</label>
            <input
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              placeholder="Project"
              className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-[#7A9099] mb-1">Priority</label>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button onClick={addTask} className="px-4 py-2 bg-[#2A9D8F] text-white rounded-[8px] text-sm font-medium hover:bg-[#1E7268] transition-colors">Save</button>
          <button onClick={() => setShowAddForm(false)} className="p-2 text-[#7A9099] hover:text-[#3D5159]"><X size={16} /></button>
        </div>
      )}

      {/* Task groups */}
      <div className="flex flex-col gap-6">
        {filter !== "done" && groupedByPriority.map(({ priority, tasks: pts }) => {
          const meta = priorityMeta[priority];
          return (
            <div key={priority}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                <span className="text-xs font-bold text-[#7A9099] tracking-widest">{meta.label}</span>
                <span className="text-xs font-medium text-[#A8BDC3] bg-[#F4F6F7] rounded-full px-2 py-0.5">{pts.length}</span>
              </div>
              <div className="rounded-[14px] border border-[#E5E9EB] bg-white overflow-hidden divide-y divide-[#F4F6F7]">
                {pts.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFBFB] transition-colors group">
                    <button
                      onClick={() => toggleDone(task.id)}
                      className="w-4 h-4 rounded border-2 border-[#D0D9DC] hover:border-[#2A9D8F] flex-shrink-0 transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A2B32] truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[#7A9099]">{task.project}</span>
                        {task.due && (
                          <>
                            <span className="text-[#D0D9DC] text-xs">·</span>
                            <span className="text-xs text-[#A8BDC3]">Due {task.due}</span>
                          </>
                        )}
                        {task.source === "transcript" && (
                          <>
                            <span className="text-[#D0D9DC] text-xs">·</span>
                            <span className="text-[10px] font-medium text-[#7A9099] bg-[#F4F6F7] rounded px-1.5 py-0.5">transcript</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${meta.badgeBg} ${meta.badgeText}`}>
                      {priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filter === "done" && doneTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#A8BDC3]" />
              <span className="text-xs font-bold text-[#7A9099] tracking-widest">DONE</span>
              <span className="text-xs font-medium text-[#A8BDC3] bg-[#F4F6F7] rounded-full px-2 py-0.5">{doneTasks.length}</span>
            </div>
            <div className="rounded-[14px] border border-[#E5E9EB] bg-white overflow-hidden divide-y divide-[#F4F6F7]">
              {doneTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-4 px-5 py-3.5">
                  <button onClick={() => toggleDone(task.id)} className="w-4 h-4 rounded border-2 border-[#2A9D8F] bg-[#2A9D8F] flex-shrink-0 flex items-center justify-center">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <p className="text-sm text-[#A8BDC3] line-through">{task.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="text-center py-16 text-[#A8BDC3]">
            <p className="text-sm font-medium">No tasks here</p>
          </div>
        )}
      </div>

      {/* Import Transcript Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E5E9EB]">
              <h2 className="text-[16px] font-semibold text-[#1C4F4F]">Import from Meeting Transcript</h2>
              <button onClick={() => { setShowImport(false); setExtracted(null); setTranscript(""); }} className="text-[#A8BDC3] hover:text-[#3D5159]"><X size={18} /></button>
            </div>
            <div className="p-6">
              {!extracted ? (
                <>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Paste Transcript</label>
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      rows={6}
                      placeholder="Paste your meeting transcript here..."
                      className="w-full bg-[#F9FAFB] border border-[#E5E9EB] rounded-[10px] px-4 py-3 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30 resize-none"
                    />
                  </div>
                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Client / Project Tag</label>
                    <input value={clientTag} onChange={(e) => setClientTag(e.target.value)} placeholder="e.g. Overclock" className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
                  </div>
                  <button
                    onClick={mockExtract}
                    disabled={!transcript.trim() || extracting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2A9D8F] text-white rounded-[10px] text-sm font-medium hover:bg-[#1E7268] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {extracting ? <><Loader2 size={15} className="animate-spin" /> Extracting with Claude...</> : "Extract Action Items →"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-[#1C4F4F] mb-4">Extracted Action Items ({extracted.filter(e => e.selected).length} selected)</p>
                  <div className="flex flex-col gap-2 mb-5 max-h-64 overflow-auto">
                    {extracted.map((item, idx) => (
                      <div key={idx} className={`flex items-start gap-3 p-3 rounded-[10px] border transition-colors cursor-pointer ${item.selected ? "border-[#2A9D8F] bg-[#E6F4F2]" : "border-[#E5E9EB] bg-white"}`} onClick={() => toggleExtracted(idx)}>
                        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${item.selected ? "border-[#2A9D8F] bg-[#2A9D8F]" : "border-[#D0D9DC]"}`}>
                          {item.selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A2B32]">{item.task}</p>
                          {item.due_hint && <p className="text-xs text-[#7A9099] mt-0.5">Due: {item.due_hint}</p>}
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${priorityMeta[item.priority].badgeBg} ${priorityMeta[item.priority].badgeText}`}>
                          {item.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button onClick={addExtracted} className="w-full py-2.5 bg-[#2A9D8F] text-white rounded-[10px] text-sm font-medium hover:bg-[#1E7268] transition-colors">
                    Add Selected to List
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </ShellLayout>
  );
}
