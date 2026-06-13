"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useState } from "react";
import { Plus, Upload, Search, X, Loader2, GripVertical, Check } from "lucide-react";
import { useTaskStore, type Priority, type Task } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";

type FilterTab = "all" | Priority | "done";

const priorityMeta: Record<Priority, { label: string; dot: string; badge: "high" | "medium" | "low" }> = {
  high: { label: "High priority", dot: "#C64545", badge: "high" },
  medium: { label: "Medium priority", dot: "#E8A55A", badge: "medium" },
  low: { label: "Low priority / Someday", dot: "#5DB872", badge: "low" },
};

interface ExtractedItem {
  task: string;
  priority: Priority;
  due_hint: string | null;
  context: string;
  selected: boolean;
}

function SortableTask({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 10 : "auto" };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3.5 group transition-colors hover:bg-[var(--color-canvas)]"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        style={{ color: "var(--color-muted-soft)" }}
        aria-label="Drag to reorder"
      >
        <GripVertical size={15} />
      </button>
      <button
        onClick={() => onToggle(task.id)}
        className="w-[18px] h-[18px] rounded-md flex-shrink-0 transition-all hover:border-[#2A9D8F]"
        style={{ border: "2px solid var(--color-hairline)" }}
        aria-label="Mark complete"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-ink)" }}>{task.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>{task.project}</span>
          {task.due && (
            <>
              <span style={{ color: "var(--color-hairline)" }}>·</span>
              <span className="text-[11px] flex-shrink-0" style={{ color: "var(--color-muted-soft)" }}>Due {task.due}</span>
            </>
          )}
          {task.source === "transcript" && (
            <>
              <span style={{ color: "var(--color-hairline)" }}>·</span>
              <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0" style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}>
                transcript
              </span>
            </>
          )}
        </div>
      </div>
      <Badge variant={priorityMeta[task.priority].badge} className="capitalize">{task.priority}</Badge>
    </div>
  );
}

export default function TodoPage() {
  const { tasks, addTask, toggleDone } = useTaskStore();
  const reorderTasks = useTaskStore((s) => s.reorderTasks);
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    addTask({ title: newTitle.trim(), project: newProject.trim() || "General", priority: newPriority, status: "todo", source: "manual" });
    setNewTitle(""); setNewProject(""); setNewPriority("medium"); setShowAddForm(false);
  };

  const matchesSearch = (t: Task) => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.project.toLowerCase().includes(search.toLowerCase());

  const filteredTasks = tasks.filter((t) => {
    if (filter === "done") return t.status === "done";
    if (filter !== "all") return t.priority === filter && t.status === "todo";
    return t.status === "todo";
  }).filter(matchesSearch);

  const groupedByPriority = (["high", "medium", "low"] as Priority[]).map((p) => ({
    priority: p,
    tasks: filteredTasks.filter((t) => t.priority === p).sort((a, b) => a.order - b.order),
  })).filter((g) => g.tasks.length > 0);

  const doneTasks = tasks.filter((t) => t.status === "done").filter(matchesSearch);

  const mockExtract = async () => {
    setExtracting(true);
    await new Promise((r) => setTimeout(r, 1600));
    setExtracted([
      { task: "Revisi cover slide ke light mode", priority: "high", due_hint: "by Friday", context: "Client requested lighter palette", selected: true },
      { task: "Kirim revised deck ke Ahmed", priority: "high", due_hint: null, context: "Send after revisions done", selected: true },
      { task: "Update transition slides with new branding", priority: "medium", due_hint: "next week", context: "Consistency across slides", selected: false },
      { task: "Konfirmasi jadwal review berikutnya", priority: "low", due_hint: null, context: "Schedule follow-up review", selected: true },
    ]);
    setExtracting(false);
  };

  const toggleExtracted = (idx: number) =>
    setExtracted((prev) => prev ? prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e) : null);

  const addExtracted = () => {
    if (!extracted) return;
    extracted.filter((e) => e.selected).forEach((e) =>
      addTask({ title: e.task, project: clientTag, priority: e.priority, status: "todo", due: e.due_hint || undefined, source: "transcript" })
    );
    setShowImport(false); setTranscript(""); setExtracted(null);
  };

  const closeImport = () => { setShowImport(false); setExtracted(null); setTranscript(""); };

  return (
    <ShellLayout>
      <PageHeader
        title="To do list"
        subtitle={`${tasks.filter((t) => t.status === "todo").length} open · ${doneTasks.length} completed`}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload size={15} /> Import Transcript
            </Button>
            <Button onClick={() => setShowAddForm((v) => !v)}>
              <Plus size={15} /> Add Task
            </Button>
          </>
        }
      />

      {/* Filters + search */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
          <TabsList>
            {(["all", "high", "medium", "low", "done"] as FilterTab[]).map((key) => (
              <TabsTrigger key={key} value={key} className="capitalize">{key}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted-soft)" }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="pl-8 w-52 py-2" />
        </div>
      </div>

      {/* Inline add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-5"
          >
            <Card className="p-4 flex flex-col sm:flex-row gap-3 sm:items-end" style={{ background: "var(--color-surface-card)" }}>
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-muted)" }}>Task</label>
                <Input
                  autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); if (e.key === "Escape") setShowAddForm(false); }}
                  placeholder="What needs to be done?" className="bg-[var(--color-surface)]"
                />
              </div>
              <div className="sm:w-40">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-muted)" }}>Project</label>
                <Input value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder="Project" className="bg-[var(--color-surface)]" />
              </div>
              <div className="sm:w-36">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-muted)" }}>Priority</label>
                <Select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)} className="bg-[var(--color-surface)]">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </div>
              <Button onClick={handleAddTask}>Save</Button>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}><X size={16} /></Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task groups */}
      <div className="flex flex-col gap-7">
        {filter !== "done" && groupedByPriority.map(({ priority, tasks: pts }) => (
          <div key={priority}>
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <div className="w-2 h-2 rounded-full" style={{ background: priorityMeta[priority].dot }} />
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "var(--color-muted)" }}>
                {priorityMeta[priority].label}
              </span>
              <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}>
                {pts.length}
              </span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (over && active.id !== over.id) reorderTasks(priority, String(active.id), String(over.id));
              }}
            >
              <SortableContext items={pts.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <Card className="overflow-hidden divide-y" style={{ borderColor: "var(--color-hairline)" }}>
                  {pts.map((task) => (
                    <div key={task.id} style={{ borderColor: "var(--color-hairline)" }}>
                      <SortableTask task={task} onToggle={toggleDone} />
                    </div>
                  ))}
                </Card>
              </SortableContext>
            </DndContext>
          </div>
        ))}

        {filter === "done" && (
          doneTasks.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-2.5 px-1">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-muted-soft)" }} />
                <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "var(--color-muted)" }}>Done</span>
                <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}>{doneTasks.length}</span>
              </div>
              <Card className="overflow-hidden">
                {doneTasks.map((task, i) => (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-3.5" style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}>
                    <button onClick={() => toggleDone(task.id)} className="w-[18px] h-[18px] rounded-md flex-shrink-0 flex items-center justify-center bg-[#2A9D8F] border-2 border-[#2A9D8F]">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </button>
                    <p className="text-[13px] line-through truncate" style={{ color: "var(--color-muted-soft)" }}>{task.title}</p>
                  </div>
                ))}
              </Card>
            </div>
          ) : (
            <EmptyState text="No completed tasks yet" />
          )
        )}

        {filter !== "done" && groupedByPriority.length === 0 && <EmptyState text="No tasks here — add one to get started" />}
      </div>

      {/* Import Transcript Dialog */}
      <Dialog open={showImport} onOpenChange={(o) => !o && closeImport()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from Meeting Transcript</DialogTitle>
            <DialogDescription>Extract action items automatically with Claude</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            {!extracted ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Paste Transcript</label>
                  <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={6} placeholder="Paste your meeting transcript here…" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Client / Project Tag</label>
                  <Input value={clientTag} onChange={(e) => setClientTag(e.target.value)} placeholder="e.g. Overclock" />
                </div>
                <Button onClick={mockExtract} disabled={!transcript.trim() || extracting} className="w-full">
                  {extracting ? <><Loader2 size={15} className="animate-spin" /> Extracting with Claude…</> : "Extract Action Items →"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-[13px] font-semibold" style={{ color: "var(--color-primary-ink)" }}>
                  Extracted {extracted.length} items · {extracted.filter((e) => e.selected).length} selected
                </p>
                <div className="flex flex-col gap-2 max-h-72 overflow-auto -mx-1 px-1">
                  {extracted.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleExtracted(idx)}
                      className="flex items-start gap-3 p-3 rounded-[10px] border text-left transition-colors"
                      style={{
                        borderColor: item.selected ? "#2A9D8F" : "var(--color-hairline)",
                        background: item.selected ? "var(--color-primary-light)" : "var(--color-surface)",
                      }}
                    >
                      <div
                        className="w-[18px] h-[18px] rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center"
                        style={{
                          border: item.selected ? "2px solid #2A9D8F" : "2px solid var(--color-hairline)",
                          background: item.selected ? "#2A9D8F" : "transparent",
                        }}
                      >
                        {item.selected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>{item.task}</p>
                        {item.due_hint && <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>Due: {item.due_hint}</p>}
                      </div>
                      <Badge variant={priorityMeta[item.priority].badge} className="capitalize flex-shrink-0">{item.priority}</Badge>
                    </button>
                  ))}
                </div>
                <Button onClick={addExtracted} className="w-full">Add Selected to List</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>{text}</p>
    </div>
  );
}
