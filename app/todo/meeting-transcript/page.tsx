"use client";

import { useState } from "react";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useMeetingStore, useTaskStore, useProjectStore,
  type MeetingAnalysis, type ExtractedTask,
} from "@/lib/store";

// ─── Helpers ──────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const fmtSaved = (ts: number) =>
  new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const PRIORITY_COLOR: Record<string, string> = {
  high: "#D85A4A",
  medium: "#D97706",
  low: "#059669",
};
const PRIORITY_LABEL: Record<string, string> = {
  high: "Urgent",
  medium: "Sedang",
  low: "Rendah",
};

// ─── Sub-components ───────────────────────────────────────────────
function SectionHeader({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color }}>{icon}</span>
      <span className="text-[13px] font-bold" style={{ color: "var(--color-ink)" }}>{label}</span>
      <span
        className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: `${color}20`, color }}
      >{count}</span>
    </div>
  );
}

function TaskCard({ task, added, onAdd }: { task: ExtractedTask; added: boolean; onAdd: () => void }) {
  const color = PRIORITY_COLOR[task.priority] ?? "#6B7280";
  return (
    <div
      className="rounded-xl p-3.5 flex items-start gap-3"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}
    >
      <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, marginTop: 5 }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--color-ink)" }}>{task.title}</p>
        {task.notes && (
          <p className="text-[11.5px] mt-1 leading-snug" style={{ color: "var(--color-muted)" }}>{task.notes}</p>
        )}
        {task.emphasis && (
          <div
            className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5"
            style={{ background: "rgba(216,90,74,0.08)" }}
          >
            <Icon name="flag" size={11} style={{ color: "#D85A4A", flexShrink: 0, marginTop: 2 }} />
            <p className="text-[11.5px] leading-snug font-medium" style={{ color: "#D85A4A" }}>
              <span className="font-bold">Tekankan: </span>{task.emphasis}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${color}18`, color }}
          >{PRIORITY_LABEL[task.priority]}</span>
          {task.deadline && (
            <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
              <Icon name="calendar" size={10} style={{ marginRight: 3 }} />{fmtDate(task.deadline)}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onAdd}
        disabled={added}
        title={added ? "Sudah ditambahkan" : "Tambah ke Todolist"}
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-40"
        style={{ background: added ? "var(--color-hairline)" : "var(--color-primary)", color: added ? "var(--color-muted)" : "var(--color-on-primary)" }}
      >
        <Icon name={added ? "check" : "plus"} size={12} />
      </button>
    </div>
  );
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return <p className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>Tidak ada.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[12.5px] leading-snug" style={{ color: "var(--color-ink)" }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]" style={{ background: color }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function AnalysisResult({ result, onSave, saved }: {
  result: Omit<MeetingAnalysis, "id" | "savedAt">;
  onSave: () => void;
  saved: boolean;
}) {
  const addTask = useTaskStore((s) => s.addTask);
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  // Target project for added tasks. Empty string = auto-create a meeting project.
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  // Tasks must land in a REAL project or they won't appear in the Todolist
  // (which is grouped per-project). If none is selected/exists, create one.
  const resolveProject = (): string => {
    if (projectId) return projectId;
    const newId = addProject({
      name: result.title || "Meeting Tasks",
      client: "—",
      description: "Task dari analisa transcript meeting",
      color: "#3B82F6",
      status: "active",
    });
    setProjectId(newId);
    return newId;
  };

  const handleAddTask = (task: ExtractedTask, idx: number, targetProject?: string) => {
    addTask({
      title: task.title,
      // Fold the emphasis into the task description so the detail isn't lost.
      description: [task.notes, task.emphasis ? `⚑ Tekankan: ${task.emphasis}` : null]
        .filter(Boolean)
        .join("\n") || undefined,
      projectId: targetProject ?? resolveProject(),
      priority: task.priority,
      status: "todo",
      source: "transcript",
      deadline: task.deadline,
    });
    setAddedIds((prev) => new Set(prev).add(idx));
  };

  const addAll = () => {
    const target = resolveProject();
    result.tasks.forEach((task, i) => {
      if (!addedIds.has(i)) handleAddTask(task, i, target);
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: "var(--color-ink)" }}>{result.title}</h2>
            <p className="text-[11.5px] mt-0.5" style={{ color: "var(--color-muted)" }}>{fmtDate(result.date)}</p>
          </div>
          <button
            onClick={onSave}
            disabled={saved}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 flex-shrink-0"
            style={{ background: saved ? "var(--color-hairline)" : "var(--color-primary)", color: saved ? "var(--color-muted)" : "var(--color-on-primary)" }}
          >
            <Icon name={saved ? "check" : "save"} size={12} />
            {saved ? "Tersimpan" : "Simpan ke Memory"}
          </button>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-body, var(--color-ink))" }}>{result.summary}</p>
      </div>

      {/* Tasks */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
      >
        <SectionHeader
          icon={<Icon name="list-check" size={14} />}
          label="Task untuk Bayu"
          count={result.tasks.length}
          color="#3B82F6"
        />
        {result.tasks.length === 0 ? (
          <p className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>Tidak ada task spesifik yang ditemukan.</p>
        ) : (
          <>
            {/* Project picker — where added tasks go */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11.5px] font-medium flex-shrink-0" style={{ color: "var(--color-muted)" }}>Masukkan ke project:</span>
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="text-[12.5px] py-1">
                <option value="">+ Buat project baru &quot;{result.title || "Meeting Tasks"}&quot;</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2.5">
              {result.tasks.map((task, i) => (
                <TaskCard
                  key={i}
                  task={task}
                  added={addedIds.has(i)}
                  onAdd={() => handleAddTask(task, i)}
                />
              ))}
            </div>
            <button
              onClick={addAll}
              className="mt-3 text-[12px] font-semibold transition-colors hover:opacity-70"
              style={{ color: "var(--color-primary)" }}
            >
              + Tambah semua ke Todolist
            </button>
          </>
        )}
      </div>

      {/* Watch & Improve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
        >
          <SectionHeader
            icon={<Icon name="alert-triangle" size={13} />}
            label="Yang Perlu Diperhatikan"
            count={result.watchPoints.length}
            color="#D97706"
          />
          <BulletList items={result.watchPoints} color="#D97706" />
        </div>
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
        >
          <SectionHeader
            icon={<Icon name="sparkles" size={13} />}
            label="Yang Perlu Diperbaiki"
            count={result.improvements.length}
            color="#8B5CF6"
          />
          <BulletList items={result.improvements} color="#8B5CF6" />
        </div>
      </div>
    </div>
  );
}

function MeetingCard({ meeting, onDelete }: { meeting: MeetingAnalysis; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl p-4 cursor-pointer transition-colors hover:border-[var(--color-primary)]/40"
      style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>{meeting.title}</p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "var(--color-muted)" }}>{fmtSaved(meeting.savedAt)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>
            {meeting.tasks.length} task
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}
          >
            <Icon name="trash" size={11} />
          </button>
          <Icon name={open ? "chevron-down" : "chevron-right"} size={12} style={{ color: "var(--color-muted)" }} />
        </div>
      </div>
      {open && (
        <div className="mt-4 border-t pt-4 flex flex-col gap-3" style={{ borderColor: "var(--color-hairline)" }}>
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>{meeting.summary}</p>
          {meeting.tasks.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Tasks</p>
              <ul className="flex flex-col gap-2">
                {meeting.tasks.map((t, i) => (
                  <li key={i} className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--color-ink)" }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[t.priority] }} />
                      {t.title}
                    </span>
                    {t.emphasis && (
                      <span className="text-[11px] ml-3.5" style={{ color: "#D85A4A" }}>⚑ {t.emphasis}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {meeting.watchPoints.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Perhatikan</p>
              <ul className="flex flex-col gap-1">
                {meeting.watchPoints.map((w, i) => (
                  <li key={i} className="text-[12.5px] flex items-start gap-2" style={{ color: "var(--color-ink)" }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]" style={{ background: "#D97706" }} />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {meeting.improvements.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Perbaiki</p>
              <ul className="flex flex-col gap-1">
                {meeting.improvements.map((imp, i) => (
                  <li key={i} className="text-[12.5px] flex items-start gap-2" style={{ color: "var(--color-ink)" }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]" style={{ background: "#8B5CF6" }} />
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function MeetingTranscriptPage() {
  const [tab, setTab] = useState("transcript");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Omit<MeetingAnalysis, "id" | "savedAt"> | null>(null);
  const [resultSaved, setResultSaved] = useState(false);

  const meetings = useMeetingStore((s) => s.meetings);
  const saveMeeting = useMeetingStore((s) => s.saveMeeting);
  const deleteMeeting = useMeetingStore((s) => s.deleteMeeting);

  const analyze = async () => {
    if (!transcript.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setResultSaved(false);
    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Terjadi kesalahan.");
        return;
      }
      setResult({ ...data, date: today() });
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result || resultSaved) return;
    saveMeeting(result);
    setResultSaved(true);
  };

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="Workboard"
        title="Meeting Transcript"
        subtitle="Paste transcript meeting — AI akan extract task, hal yang perlu diperhatikan, dan area improvement untuk Bayu."
      />

      <div className="max-w-3xl mx-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="transcript">
              <Icon name="mic" size={13} style={{ marginRight: 6 }} /> Transcript
            </TabsTrigger>
            <TabsTrigger value="history">
              <Icon name="history" size={13} style={{ marginRight: 6 }} /> Riwayat
              {meetings.length > 0 && (
                <span className="ml-1.5 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}>
                  {meetings.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Transcript tab ── */}
          <TabsContent value="transcript" className="flex flex-col gap-6">
            <div
              className="rounded-2xl p-5"
              style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
            >
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>
                Transcript Meeting
              </label>
              <Textarea
                rows={10}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={`Paste transcript meeting di sini...\n\nContoh:\nBayu: Oke, jadi untuk project website klien A, saya akan handle bagian UI dulu minggu ini.\nClient: Tolong deadline UI-nya hari Jumat ya, dan pastikan mobile-first.\nBayu: Siap. Saya juga perlu revisi copywriting dari tim konten dulu.`}
                className="text-[13px]"
              />
              {error && (
                <div className="flex items-start gap-2 mt-3 text-[12.5px] rounded-lg px-3 py-2" style={{ background: "rgba(216,90,74,0.1)", color: "#D85A4A" }}>
                  <Icon name="alert-triangle" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-4">
                <span className="text-[11.5px]" style={{ color: "var(--color-muted)" }}>
                  {transcript.trim().split(/\s+/).filter(Boolean).length} kata
                </span>
                <div className="flex gap-2">
                  {transcript && (
                    <Button variant="outline" onClick={() => { setTranscript(""); setResult(null); setError(null); }}>
                      Bersihkan
                    </Button>
                  )}
                  <Button onClick={analyze} disabled={loading || !transcript.trim()}>
                    {loading ? (
                      <><Icon name="spinner" size={13} spin /> Menganalisa…</>
                    ) : (
                      <><Icon name="sparkles" size={13} /> Analisa Transcript</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {result && (
              <AnalysisResult result={result} onSave={handleSave} saved={resultSaved} />
            )}
          </TabsContent>

          {/* ── History tab ── */}
          <TabsContent value="history">
            {meetings.length === 0 ? (
              <div
                className="rounded-2xl p-10 text-center flex flex-col items-center gap-2"
                style={{ background: "var(--color-surface-card)", border: "1px dashed var(--color-hairline)" }}
              >
                <Icon name="history" size={22} style={{ color: "var(--color-muted-soft)" }} />
                <p className="text-[13px] font-medium" style={{ color: "var(--color-muted)" }}>Belum ada riwayat meeting</p>
                <p className="text-[12px]" style={{ color: "var(--color-muted-soft)" }}>Analisa transcript dan klik &quot;Simpan ke Memory&quot; untuk mendokumentasikannya di sini.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {meetings.map((m) => (
                  <MeetingCard key={m.id} meeting={m} onDelete={() => deleteMeeting(m.id)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ShellLayout>
  );
}
