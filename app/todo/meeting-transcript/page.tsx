"use client";

import { useEffect, useRef, useState } from "react";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useMeetingStore, useTaskStore, useProjectStore,
  type MeetingAnalysis, type MeetingChatMessage, type ExtractedTask,
} from "@/lib/store";

// ─── Helpers ──────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const fmtSaved = (ts: number) =>
  new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const PRIORITY_COLOR: Record<string, string> = { high: "#D85A4A", medium: "#D97706", low: "#059669" };
const PRIORITY_LABEL: Record<string, string> = { high: "Urgent", medium: "Sedang", low: "Rendah" };

function moodColor(score: number) {
  if (score >= 75) return "#059669";
  if (score >= 50) return "#D97706";
  return "#D85A4A";
}
function moodEmoji(score: number) {
  if (score >= 80) return "😄";
  if (score >= 65) return "🙂";
  if (score >= 45) return "😐";
  if (score >= 30) return "😟";
  return "😣";
}

// ─── Components ───────────────────────────────────────────────────
function SectionBlock({ icon, label, count, color, children }: {
  icon: React.ReactNode; label: string; count: number; color: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>{label}</span>
        <span className="ml-auto text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return <p className="text-[12px] italic" style={{ color: "var(--color-muted-soft)" }}>Tidak ada.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug" style={{ color: "var(--color-ink)" }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]" style={{ background: color }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function TaskCard({ task, added, onAdd }: { task: ExtractedTask; added: boolean; onAdd: () => void }) {
  const color = PRIORITY_COLOR[task.priority] ?? "#6B7280";
  return (
    <div className="rounded-xl p-3.5 flex items-start gap-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-[5px]" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--color-ink)" }}>{task.title}</p>
        {task.notes && (
          <p className="text-[11.5px] mt-1 leading-snug" style={{ color: "var(--color-muted)" }}>{task.notes}</p>
        )}
        {task.emphasis && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: "rgba(216,90,74,0.08)" }}>
            <Icon name="flag" size={11} style={{ color: "#D85A4A", flexShrink: 0, marginTop: 2 }} />
            <p className="text-[11.5px] leading-snug font-medium" style={{ color: "#D85A4A" }}>
              <span className="font-bold">Tekankan: </span>{task.emphasis}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>
            {PRIORITY_LABEL[task.priority]}
          </span>
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

// ─── Full analysis panel ──────────────────────────────────────────
type ActiveSession = Omit<MeetingAnalysis, "id" | "savedAt"> & { transcript: string; initialQuestions: string[] };

function AnalysisPanel({ session, onTasksChange }: {
  session: ActiveSession;
  onTasksChange: (tasks: ExtractedTask[]) => void;
}) {
  const addTask = useTaskStore((s) => s.addTask);
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  const resolveProject = (): string => {
    if (projectId) return projectId;
    const newId = addProject({
      name: session.title || "Meeting Tasks",
      client: "—",
      description: "Task dari analisa transcript meeting",
      color: "#3B82F6",
      status: "active",
    });
    setProjectId(newId);
    return newId;
  };

  const handleAddTask = (task: ExtractedTask, idx: number, target?: string) => {
    addTask({
      title: task.title,
      description: [task.notes, task.emphasis ? `⚑ Tekankan: ${task.emphasis}` : null].filter(Boolean).join("\n") || undefined,
      projectId: target ?? resolveProject(),
      priority: task.priority,
      status: "todo",
      source: "transcript",
      deadline: task.deadline,
    });
    setAddedIds((prev) => new Set(prev).add(idx));
  };

  const addAll = () => {
    const target = resolveProject();
    session.tasks.forEach((task, i) => { if (!addedIds.has(i)) handleAddTask(task, i, target); });
  };

  const score = session.moodScore;
  const scoreColor = moodColor(score);

  return (
    <div className="flex flex-col gap-5">
      {/* Header: title + mood */}
      <div className="rounded-2xl p-5" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-bold leading-snug" style={{ color: "var(--color-ink)" }}>{session.title}</h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>{fmtDate(session.date)}</p>
          </div>
          {/* Mood score */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1 rounded-2xl px-4 py-3 min-w-[90px]" style={{ background: `${scoreColor}12`, border: `1px solid ${scoreColor}30` }}>
            <span className="text-2xl leading-none">{moodEmoji(score)}</span>
            <span className="text-[20px] font-bold leading-none" style={{ color: scoreColor }}>{score}%</span>
            <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: scoreColor }}>{session.moodLabel}</span>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed mt-3" style={{ color: "var(--color-body, var(--color-ink))" }}>{session.summary}</p>
        {session.moodReason && (
          <p className="text-[11.5px] mt-2 px-3 py-2 rounded-lg" style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}>
            <Icon name="lightbulb" size={11} style={{ marginRight: 5 }} />{session.moodReason}
          </p>
        )}
      </div>

      {/* Tasks */}
      <div className="rounded-2xl p-5" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}>
        <SectionBlock icon={<Icon name="list-check" size={14} />} label="Task untuk Bayu" count={session.tasks.length} color="#3B82F6">
          {session.tasks.length === 0 ? (
            <p className="text-[12px] italic" style={{ color: "var(--color-muted-soft)" }}>Tidak ada task spesifik ditemukan.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 mt-1">
                <span className="text-[11.5px] font-medium flex-shrink-0" style={{ color: "var(--color-muted)" }}>Masukkan ke project:</span>
                <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="text-[12.5px] py-1">
                  <option value="">+ Buat project baru &quot;{session.title || "Meeting Tasks"}&quot;</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div className="flex flex-col gap-2.5">
                {session.tasks.map((task, i) => (
                  <TaskCard key={i} task={task} added={addedIds.has(i)} onAdd={() => handleAddTask(task, i)} />
                ))}
              </div>
              <button onClick={addAll} className="mt-3 text-[12px] font-semibold hover:opacity-70 transition-opacity" style={{ color: "var(--color-primary)" }}>
                + Tambah semua ke Todolist
              </button>
            </>
          )}
        </SectionBlock>
      </div>

      {/* Decisions + WaitingOn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}>
          <SectionBlock icon={<Icon name="check-circle" size={13} />} label="Keputusan Disepakati" count={session.decisions.length} color="#059669">
            <BulletList items={session.decisions} color="#059669" />
          </SectionBlock>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}>
          <SectionBlock icon={<Icon name="clock" size={13} />} label="Menunggu dari Orang Lain" count={session.waitingOn.length} color="#8B5CF6">
            <BulletList items={session.waitingOn} color="#8B5CF6" />
          </SectionBlock>
        </div>
      </div>

      {/* WatchPoints + Improvements + OpenQuestions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}>
          <SectionBlock icon={<Icon name="alert-triangle" size={13} />} label="Perhatikan" count={session.watchPoints.length} color="#D97706">
            <BulletList items={session.watchPoints} color="#D97706" />
          </SectionBlock>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}>
          <SectionBlock icon={<Icon name="sparkles" size={13} />} label="Perbaiki" count={session.improvements.length} color="#D85A4A">
            <BulletList items={session.improvements} color="#D85A4A" />
          </SectionBlock>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}>
          <SectionBlock icon={<Icon name="circle-dot" size={13} />} label="Pertanyaan Terbuka" count={session.openQuestions.length} color="#6B7280">
            <BulletList items={session.openQuestions} color="#6B7280" />
          </SectionBlock>
        </div>
      </div>
    </div>
  );
}

// ─── Chat session ─────────────────────────────────────────────────
function SessionChat({ session, chatHistory, onMessage, onSave, saving }: {
  session: ActiveSession;
  chatHistory: MeetingChatMessage[];
  onMessage: (msg: string) => Promise<void>;
  onSave: () => void;
  saving: boolean;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    await onMessage(msg);
    setSending(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-hairline)" }}>
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ background: "var(--color-canvas)", borderBottom: "1px solid var(--color-hairline)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <Icon name="sparkles" size={12} style={{ color: "var(--color-on-primary)" }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Sesi Verifikasi</p>
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Konfirmasi & lengkapi analisa bersama AI</p>
          </div>
        </div>
        <Button onClick={onSave} disabled={saving} className="text-[12px]">
          <Icon name={saving ? "spinner" : "save"} size={12} spin={saving} />
          {saving ? "Menyimpan…" : "Selesai & Simpan"}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 p-5 max-h-[380px] overflow-y-auto" style={{ background: "var(--color-surface-card)" }}>
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0" style={{ background: "var(--color-primary)" }}>
                <Icon name="sparkles" size={10} style={{ color: "var(--color-on-primary)" }} />
              </div>
            )}
            <div
              className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
              style={msg.role === "user"
                ? { background: "var(--color-primary)", color: "var(--color-on-primary)", borderBottomRightRadius: 6 }
                : { background: "var(--color-canvas)", color: "var(--color-ink)", borderBottomLeftRadius: 6 }
              }
            >
              {msg.content.split("\n").map((line, j) => (
                <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-primary)" }}>
              <Icon name="sparkles" size={10} style={{ color: "var(--color-on-primary)" }} />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md" style={{ background: "var(--color-canvas)" }}>
              <Icon name="spinner" size={13} spin style={{ color: "var(--color-muted)" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 p-4" style={{ background: "var(--color-surface-card)", borderTop: "1px solid var(--color-hairline)" }}>
        <Textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ketik konfirmasi, tambahan, atau koreksi… (Enter kirim)"
          className="flex-1 text-[13px] resize-none min-h-[38px] max-h-[120px]"
          style={{ overflowY: "auto" } as React.CSSProperties}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-opacity hover:opacity-80 disabled:opacity-40 flex-shrink-0"
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          <Icon name="send" size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── History card ─────────────────────────────────────────────────
function MeetingCard({ meeting, onDelete }: { meeting: MeetingAnalysis; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const scoreColor = moodColor(meeting.moodScore ?? 50);
  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Mood mini badge */}
        <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: `${scoreColor}12` }}>
          <span className="text-base leading-none">{moodEmoji(meeting.moodScore ?? 50)}</span>
          <span className="text-[10px] font-bold leading-none mt-0.5" style={{ color: scoreColor }}>{meeting.moodScore ?? "?"}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>{meeting.title}</p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "var(--color-muted)" }}>{fmtSaved(meeting.savedAt)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>
            {meeting.tasks.length} task
          </span>
          {(meeting.chatHistory?.length ?? 0) > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}>
              {meeting.chatHistory.length} chat
            </span>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-70" style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}>
            <Icon name="trash" size={11} />
          </button>
          <Icon name={open ? "chevron-down" : "chevron-right"} size={12} style={{ color: "var(--color-muted)" }} />
        </div>
      </div>
      {open && (
        <div className="border-t px-4 pb-4 pt-3 flex flex-col gap-4" style={{ borderColor: "var(--color-hairline)" }}>
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>{meeting.summary}</p>
          {meeting.moodReason && (
            <p className="text-[11.5px] px-3 py-2 rounded-lg" style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}>
              <Icon name="lightbulb" size={11} style={{ marginRight: 5 }} />{meeting.moodReason}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meeting.tasks.length > 0 && (
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Tasks ({meeting.tasks.length})</p>
                <ul className="flex flex-col gap-1.5">
                  {meeting.tasks.map((t, i) => (
                    <li key={i} className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--color-ink)" }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[t.priority] }} />
                        {t.title}
                      </span>
                      {t.emphasis && <span className="text-[11px] ml-3.5" style={{ color: "#D85A4A" }}>⚑ {t.emphasis}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {meeting.decisions.length > 0 && (
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Keputusan</p>
                <BulletList items={meeting.decisions} color="#059669" />
              </div>
            )}
            {meeting.waitingOn.length > 0 && (
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Menunggu dari</p>
                <BulletList items={meeting.waitingOn} color="#8B5CF6" />
              </div>
            )}
            {meeting.watchPoints.length > 0 && (
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Perhatikan</p>
                <BulletList items={meeting.watchPoints} color="#D97706" />
              </div>
            )}
          </div>
          {/* Chat history in saved meeting */}
          {(meeting.chatHistory?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Sesi Verifikasi</p>
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                {meeting.chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed"
                      style={msg.role === "user"
                        ? { background: "var(--color-primary)", color: "var(--color-on-primary)" }
                        : { background: "var(--color-canvas)", color: "var(--color-ink)" }
                      }
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
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
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [chatHistory, setChatHistory] = useState<MeetingChatMessage[]>([]);
  const [saving, setSaving] = useState(false);

  const meetings = useMeetingStore((s) => s.meetings);
  const saveMeeting = useMeetingStore((s) => s.saveMeeting);
  const deleteMeeting = useMeetingStore((s) => s.deleteMeeting);

  const analyze = async () => {
    if (!transcript.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSession(null);
    setChatHistory([]);
    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? "Terjadi kesalahan."); return; }
      const newSession: ActiveSession = { ...data, date: today(), transcript, chatHistory: [] };
      setSession(newSession);

      // Seed chat with AI opening — ask any initial questions from the analysis
      const questions: string[] = data.initialQuestions ?? [];
      const openingMsg = questions.length > 0
        ? `Analisa selesai! Saya menemukan **${data.tasks.length} task** untuk kamu.\n\nAda beberapa hal yang ingin saya klarifikasi dulu:\n\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}`
        : `Analisa selesai! Saya menemukan **${data.tasks.length} task** untuk kamu. Apakah ada hal yang kurang atau perlu dikoreksi dari hasil analisa di atas?`;

      setChatHistory([{ role: "assistant", content: openingMsg, timestamp: Date.now() }]);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async (userMsg: string) => {
    if (!session) return;
    const userEntry: MeetingChatMessage = { role: "user", content: userMsg, timestamp: Date.now() };
    const updatedHistory = [...chatHistory, userEntry];
    setChatHistory(updatedHistory);

    try {
      const res = await fetch("/api/transcript/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: session.transcript,
          analysis: session,
          messages: updatedHistory.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          userMessage: userMsg,
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Maaf, terjadi masalah.";
      setChatHistory((prev) => [...prev, { role: "assistant", content: reply, timestamp: Date.now() }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "assistant", content: "Koneksi gagal. Coba lagi.", timestamp: Date.now() }]);
    }
  };

  const handleSave = () => {
    if (!session || saving) return;
    setSaving(true);
    saveMeeting({ ...session, chatHistory });
    setSaving(false);
    // Switch to history tab after save
    setTab("history");
    setSession(null);
    setChatHistory([]);
    setTranscript("");
  };

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="Workboard"
        title="Meeting Transcript"
        subtitle="Paste transcript → AI analisa mendalam → verifikasi via chat → simpan ke dokumentasi."
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
            {/* Input area — hide after analysis to keep focus on results */}
            {!session ? (
              <div className="rounded-2xl p-5" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>
                  Transcript Meeting
                </label>
                <Textarea
                  rows={12}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={`Paste transcript meeting di sini...\n\nContoh:\nBayu: Oke, jadi untuk project Atrium, saya akan revisi homepage dulu.\nClient: Jangan pakai elemen grafik "graph going up" ya, terlalu klise.\nBayu: Siap. Deadline hari Jumat?\nClient: Iya, Jumat siang.\nBayu: Oke, noted.`}
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
                  <Button onClick={analyze} disabled={loading || !transcript.trim()}>
                    {loading ? (
                      <><Icon name="spinner" size={13} spin /> Menganalisa…</>
                    ) : (
                      <><Icon name="sparkles" size={13} /> Analisa Transcript</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Small "analyze new" bar when session is active */
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)" }}>
                <p className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>Sesi aktif: <strong style={{ color: "var(--color-ink)" }}>{session.title}</strong></p>
                <button onClick={() => { setSession(null); setChatHistory([]); }} className="text-[12px] hover:opacity-70 transition-opacity" style={{ color: "var(--color-primary)" }}>
                  ← Ganti transcript
                </button>
              </div>
            )}

            {/* Analysis result */}
            {session && <AnalysisPanel session={session} onTasksChange={(tasks) => setSession((s) => s ? { ...s, tasks } : s)} />}

            {/* Chat session */}
            {session && (
              <SessionChat
                session={session}
                chatHistory={chatHistory}
                onMessage={sendChat}
                onSave={handleSave}
                saving={saving}
              />
            )}
          </TabsContent>

          {/* ── History tab ── */}
          <TabsContent value="history">
            {meetings.length === 0 ? (
              <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-2" style={{ background: "var(--color-surface-card)", border: "1px dashed var(--color-hairline)" }}>
                <Icon name="history" size={24} style={{ color: "var(--color-muted-soft)" }} />
                <p className="text-[13px] font-medium" style={{ color: "var(--color-muted)" }}>Belum ada riwayat meeting</p>
                <p className="text-[12px]" style={{ color: "var(--color-muted-soft)" }}>Analisa transcript dan klik &quot;Selesai &amp; Simpan&quot; untuk mendokumentasikannya di sini.</p>
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
