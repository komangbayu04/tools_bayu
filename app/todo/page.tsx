"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  useTaskStore, useProjectStore,
  type Priority, type ProjectStatus,
} from "@/lib/store";
import { PROJECT_PALETTE, progressOf, isProjectComplete } from "./shared";

interface ExtractedItem {
  task: string;
  priority: Priority;
  due_hint: string | null;
  context: string;
  selected: boolean;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
      {children}
    </label>
  );
}

export default function TodoPage() {
  const router = useRouter();
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);

  // New project dialog
  const [showProject, setShowProject] = useState(false);
  const [pName, setPName] = useState("");
  const [pClient, setPClient] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pColor, setPColor] = useState(PROJECT_PALETTE[0]);
  const [pStatus, setPStatus] = useState<ProjectStatus>("active");

  // Import transcript dialog
  const [showImport, setShowImport] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [importProject, setImportProject] = useState(projects[0]?.id ?? "");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedItem[] | null>(null);

  // Quick create task dialog
  const [showTask, setShowTask] = useState(false);
  const [tTitle, setTTitle] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tProject, setTProject] = useState(projects[0]?.id ?? "");
  const [tPriority, setTPriority] = useState<Priority>("medium");
  const [tStatus, setTStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [tDeadline, setTDeadline] = useState("");
  const [tHours, setTHours] = useState("");

  const resetTask = () => {
    setTTitle(""); setTDesc(""); setTPriority("medium"); setTStatus("todo");
    setTDeadline(""); setTHours(""); setTProject(projects[0]?.id ?? "");
  };

  const handleCreateTask = () => {
    if (!tTitle.trim() || !tProject) return;
    addTask({
      title: tTitle.trim(),
      description: tDesc.trim() || undefined,
      projectId: tProject,
      priority: tPriority,
      status: tStatus,
      deadline: tDeadline || undefined,
      hours: tHours ? Number(tHours) : undefined,
      source: "manual",
    });
    resetTask();
    setShowTask(false);
  };

  const allCounts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  // Top summary stats
  const tasksCompleted = allCounts.done;
  const hoursWorked = tasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + (t.hours || 0), 0);
  const projectsCompleted = projects.filter((p) =>
    isProjectComplete(tasks.filter((t) => t.projectId === p.id))
  ).length;

  const resetProject = () => {
    setPName(""); setPClient(""); setPDesc(""); setPColor(PROJECT_PALETTE[0]); setPStatus("active");
  };

  const handleCreateProject = () => {
    if (!pName.trim()) return;
    addProject({
      name: pName.trim(),
      client: pClient.trim() || "—",
      description: pDesc.trim() || undefined,
      color: pColor,
      status: pStatus,
    });
    resetProject();
    setShowProject(false);
  };

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
    setExtracted((prev) => (prev ? prev.map((e, i) => (i === idx ? { ...e, selected: !e.selected } : e)) : null));

  const addExtracted = () => {
    if (!extracted || !importProject) return;
    extracted.filter((e) => e.selected).forEach((e) =>
      addTask({
        title: e.task,
        projectId: importProject,
        priority: e.priority,
        status: "todo",
        due: e.due_hint || undefined,
        source: "transcript",
      })
    );
    closeImport();
  };

  const closeImport = () => { setShowImport(false); setExtracted(null); setTranscript(""); };

  return (
    <ShellLayout>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} projects · ${allCounts.todo + allCounts.in_progress} open tasks`}
        actions={
          <>
            <Button variant="outline" onClick={() => { setImportProject(projects[0]?.id ?? ""); setShowImport(true); }}>
              <Icon name="upload" size={15} /> Import Transcript
            </Button>
            <Button onClick={() => setShowProject(true)}>
              <Icon name="plus" size={15} /> New Project
            </Button>
          </>
        }
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          icon="check-circle"
          tint="#5DB872"
          value={String(tasksCompleted)}
          label="Task selesai"
          hint={`dari ${tasks.length} total task`}
        />
        <SummaryCard
          icon="clock"
          tint="var(--color-primary)"
          value={`${hoursWorked % 1 === 0 ? hoursWorked : hoursWorked.toFixed(1)}h`}
          label="Jam kerja"
          hint="dari task yang selesai"
        />
        <SummaryCard
          icon="folder-open"
          tint="#6D8DF0"
          value={String(projectsCompleted)}
          label="Project selesai"
          hint={`dari ${projects.length} project`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* LEFT: project list */}
        <div className="flex flex-col gap-3">
          {projects.length === 0 && (
            <Card className="p-10 text-center">
              <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>
                No projects yet — create one to get started.
              </p>
            </Card>
          )}
          {projects.map((project) => {
            const pTasks = tasks.filter((t) => t.projectId === project.id);
            const { done, total, pct } = progressOf(pTasks);
            const hours = pTasks.reduce((s, t) => s + (t.hours || 0), 0);
            const complete = isProjectComplete(pTasks);
            return (
              <Card
                key={project.id}
                onClick={() => router.push(`/todo/${project.id}`)}
                className="group relative p-5 cursor-pointer transition-all hover:shadow-md"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Delete project "${project.name}"?`)) deleteProject(project.id); }}
                  className="absolute right-4 top-4 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-canvas)]"
                  style={{ color: "var(--color-muted-soft)" }}
                  aria-label="Delete project"
                >
                  <Icon name="trash" size={13} />
                </button>

                <div className="flex items-start gap-3">
                  <span className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: project.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>{project.name}</h3>
                      {complete ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "color-mix(in srgb, #5DB872 16%, transparent)", color: "#3d8a52" }}
                        >
                          <Icon name="check-circle" size={10} /> Selesai
                        </span>
                      ) : project.status !== "active" && (
                        <Badge variant="gray" className="capitalize">{project.status}</Badge>
                      )}
                    </div>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>{project.client}</p>

                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-canvas)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: project.color }} />
                      </div>
                      <span className="text-[11px] flex-shrink-0" style={{ color: "var(--color-muted-soft)" }}>{done}/{total}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-2.5 text-[11px]" style={{ color: "var(--color-muted-soft)" }}>
                      <span className="flex items-center gap-1"><Icon name="list-check" size={11} /> {total} tasks</span>
                      {hours > 0 && <span className="flex items-center gap-1"><Icon name="clock" size={11} /> {hours}h</span>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* RIGHT: quick stats */}
        <Card className="p-5 lg:sticky lg:top-6">
          <h3 className="text-[13px] font-bold uppercase tracking-wider mb-4" style={{ color: "var(--color-muted)" }}>Quick stats</h3>
          <div className="flex flex-col gap-2.5">
            <StatRow label="Open / To Do" value={allCounts.todo} dot="var(--color-muted-soft)" />
            <StatRow label="In Progress" value={allCounts.in_progress} dot="#E8A55A" />
            <StatRow label="Done" value={allCounts.done} dot="#5DB872" />
          </div>
          <div className="h-px my-4" style={{ background: "var(--color-hairline)" }} />
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => router.push("/todo/all")}>
              <Icon name="list-check" size={15} /> Lihat Semua Task
            </Button>
            <Button
              className="flex-shrink-0"
              onClick={() => { setTProject(projects[0]?.id ?? ""); setShowTask(true); }}
              disabled={projects.length === 0}
            >
              <Icon name="plus" size={15} /> Buat Task
            </Button>
          </div>
        </Card>
      </div>

      {/* New Project Dialog */}
      <Dialog open={showProject} onOpenChange={(o) => { if (!o) { setShowProject(false); resetProject(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a project to organize your tasks</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <FieldLabel>Name</FieldLabel>
              <Input autoFocus value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Project name" />
            </div>
            <div>
              <FieldLabel>Client</FieldLabel>
              <Input value={pClient} onChange={(e) => setPClient(e.target.value)} placeholder="Client name" />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Textarea rows={2} value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <div>
              <FieldLabel>Color</FieldLabel>
              <div className="flex items-center gap-2 flex-wrap">
                {PROJECT_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPColor(c)}
                    className="w-7 h-7 rounded-full transition-transform"
                    style={{ background: c, outline: pColor === c ? "2px solid var(--color-ink)" : "none", outlineOffset: 2 }}
                    aria-label={`Pick ${c}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select value={pStatus} onChange={(e) => setPStatus(e.target.value as ProjectStatus)}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => { setShowProject(false); resetProject(); }}>Cancel</Button>
              <Button onClick={handleCreateProject} disabled={!pName.trim()}>Create Project</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Create Task Dialog */}
      <Dialog open={showTask} onOpenChange={(o) => { if (!o) { setShowTask(false); resetTask(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Task</DialogTitle>
            <DialogDescription>Tambahkan task baru ke salah satu project</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <FieldLabel>Task</FieldLabel>
              <Input autoFocus value={tTitle} onChange={(e) => setTTitle(e.target.value)} placeholder="Apa yang perlu dikerjakan?" />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Textarea rows={2} value={tDesc} onChange={(e) => setTDesc(e.target.value)} placeholder="Detail tambahan (opsional)…" />
            </div>
            <div>
              <FieldLabel>Project</FieldLabel>
              <Select value={tProject} onChange={(e) => setTProject(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {p.client}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Priority</FieldLabel>
                <Select value={tPriority} onChange={(e) => setTPriority(e.target.value as Priority)}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select value={tStatus} onChange={(e) => setTStatus(e.target.value as "todo" | "in_progress" | "done")}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Deadline</FieldLabel>
                <Input type="date" value={tDeadline} onChange={(e) => setTDeadline(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Estimasi Jam</FieldLabel>
                <Input type="number" min={0} step={0.5} value={tHours} onChange={(e) => setTHours(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => { setShowTask(false); resetTask(); }}>Cancel</Button>
              <Button onClick={handleCreateTask} disabled={!tTitle.trim() || !tProject}>Buat Task</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <FieldLabel>Paste Transcript</FieldLabel>
                  <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={6} placeholder="Paste your meeting transcript here…" />
                </div>
                <div>
                  <FieldLabel>Assign to Project</FieldLabel>
                  <Select value={importProject} onChange={(e) => setImportProject(e.target.value)}>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} · {p.client}</option>
                    ))}
                  </Select>
                </div>
                <Button onClick={mockExtract} disabled={!transcript.trim() || extracting || !importProject} className="w-full">
                  {extracting ? <><Icon name="spinner" size={15} spin /> Extracting with Claude…</> : "Extract Action Items →"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>
                  Extracted {extracted.length} items · {extracted.filter((e) => e.selected).length} selected
                </p>
                <div className="flex flex-col gap-2 max-h-72 overflow-auto -mx-1 px-1">
                  {extracted.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleExtracted(idx)}
                      className="flex items-start gap-3 p-3 rounded-[10px] border text-left transition-colors"
                      style={{
                        borderColor: item.selected ? "var(--color-primary)" : "var(--color-hairline)",
                        background: item.selected ? "var(--color-primary-light)" : "var(--color-surface)",
                      }}
                    >
                      <div
                        className="w-[18px] h-[18px] rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center"
                        style={{
                          border: item.selected ? "2px solid var(--color-primary)" : "2px solid var(--color-hairline)",
                          background: item.selected ? "var(--color-primary)" : "transparent",
                        }}
                      >
                        {item.selected && <Icon name="check" size={11} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>{item.task}</p>
                        {item.due_hint && <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>Due: {item.due_hint}</p>}
                      </div>
                      <Badge variant={item.priority} className="capitalize flex-shrink-0">{item.priority}</Badge>
                    </button>
                  ))}
                </div>
                <Button onClick={addExtracted} className="w-full">Add Selected to Project</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}

function SummaryCard({
  icon, tint, value, label, hint,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  tint: string;
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `color-mix(in srgb, ${tint} 16%, transparent)` }}
      >
        <Icon name={icon} size={22} style={{ color: tint }} />
      </div>
      <div className="min-w-0">
        <p className="text-[26px] font-bold leading-none tracking-tight" style={{ color: "var(--color-ink)" }}>{value}</p>
        <p className="text-[13px] font-semibold mt-1.5" style={{ color: "var(--color-body)" }}>{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted-soft)" }}>{hint}</p>
      </div>
    </Card>
  );
}

function StatRow({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[13px]" style={{ color: "var(--color-body)" }}>
        <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
        {label}
      </span>
      <span className="text-[15px] font-semibold" style={{ color: "var(--color-ink)" }}>{value}</span>
    </div>
  );
}
