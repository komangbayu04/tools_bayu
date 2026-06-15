"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useWorkflowStore,
  useWorkflowRunStore,
  type WorkflowStep,
} from "@/lib/aiStore";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

// ─── Template definitions ─────────────────────────────────────────────────────
const TEMPLATES = [
  {
    name: "Content Brief → Caption → Hashtag",
    description: "Dari brief, buat caption dan hashtag siap pakai.",
    steps: [
      {
        title: "Content Brief",
        prompt: "Berdasarkan topik berikut, buat content brief yang mencakup target audiens, pesan utama, dan tone of voice:\n\n{{input}}",
        note: "Membuat brief konten dari input user",
      },
      {
        title: "Caption",
        prompt: "Berdasarkan content brief di atas, tulis caption media sosial yang menarik (maks. 150 kata).",
        note: "Menulis caption dari brief",
      },
      {
        title: "Hashtag",
        prompt: "Berdasarkan caption di atas, buat 15–20 hashtag yang relevan dan optimal untuk jangkauan.",
        note: "Menghasilkan hashtag dari caption",
      },
    ],
  },
  {
    name: "Riset Topik → Outline → Draft",
    description: "Riset topik, buat outline, lalu hasilkan draft artikel.",
    steps: [
      {
        title: "Riset Topik",
        prompt: "Lakukan riset mendalam tentang topik berikut, identifikasi poin-poin penting dan tren terkini:\n\n{{input}}",
        note: "Riset mendalam tentang topik",
      },
      {
        title: "Outline Artikel",
        prompt: "Berdasarkan riset di atas, buat outline artikel blog yang terstruktur dengan H2 dan H3 yang jelas.",
        note: "Membuat outline dari hasil riset",
      },
      {
        title: "Draft Artikel",
        prompt: "Tulis draft artikel blog lengkap berdasarkan outline di atas. Gunakan bahasa yang engaging dan informatif.",
        note: "Menulis draft dari outline",
      },
    ],
  },
  {
    name: "Analisis Kompetitor → SWOT → Rekomendasi",
    description: "Analisis kompetitor, buat SWOT, lalu beri rekomendasi strategis.",
    steps: [
      {
        title: "Analisis Kompetitor",
        prompt: "Analisis kompetitor berikut secara mendalam: produk, harga, strategi marketing, dan posisi pasar:\n\n{{input}}",
        note: "Analisis mendalam tentang kompetitor",
      },
      {
        title: "Analisis SWOT",
        prompt: "Berdasarkan analisis kompetitor di atas, buat analisis SWOT lengkap (Strengths, Weaknesses, Opportunities, Threats).",
        note: "Membuat SWOT dari analisis",
      },
      {
        title: "Rekomendasi Strategis",
        prompt: "Berdasarkan analisis SWOT di atas, berikan 5–7 rekomendasi strategis yang actionable dan terukur.",
        note: "Rekomendasi berdasarkan SWOT",
      },
    ],
  },
];

// ─── Run step state ───────────────────────────────────────────────────────────
interface RunStepState {
  stepId: string;
  title: string;
  status: "pending" | "running" | "done" | "error";
  output: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts: number) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WorkflowRunnerPage() {
  const {
    workflows,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    addStep,
    updateStep,
    deleteStep,
  } = useWorkflowStore();

  const { runs, addRun, deleteRun } = useWorkflowRunStore();

  const [selectedId, setSelectedId] = useState<string | null>(
    () => workflows[0]?.id ?? null
  );

  const selected = useMemo(
    () => workflows.find((w) => w.id === selectedId) ?? null,
    [workflows, selectedId]
  );

  const workflowRuns = useMemo(
    () => runs.filter((r) => r.workflowId === selectedId),
    [runs, selectedId]
  );

  // ─── Create workflow dialog ───────────────────────────────────────
  const [wfDialogOpen, setWfDialogOpen] = useState(false);
  const [wfName, setWfName] = useState("");
  const [wfDesc, setWfDesc] = useState("");

  const openWfDialog = () => {
    setWfName("");
    setWfDesc("");
    setWfDialogOpen(true);
  };

  const submitWorkflow = () => {
    const name = wfName.trim();
    if (!name) return;
    const id = addWorkflow({ name, description: wfDesc.trim() });
    setSelectedId(id);
    setWfDialogOpen(false);
  };

  // ─── Edit workflow dialog ─────────────────────────────────────────
  const [wfEditOpen, setWfEditOpen] = useState(false);
  const [wfEditName, setWfEditName] = useState("");
  const [wfEditDesc, setWfEditDesc] = useState("");

  const openWfEdit = () => {
    if (!selected) return;
    setWfEditName(selected.name);
    setWfEditDesc(selected.description);
    setWfEditOpen(true);
  };

  const submitWfEdit = () => {
    if (!selected) return;
    const name = wfEditName.trim();
    if (!name) return;
    updateWorkflow(selected.id, { name, description: wfEditDesc.trim() });
    setWfEditOpen(false);
  };

  const handleDeleteWorkflow = (id: string, name: string) => {
    if (!confirm(`Hapus workflow "${name}"?`)) return;
    deleteWorkflow(id);
    if (selectedId === id) {
      const remaining = workflows.filter((w) => w.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
  };

  // ─── Inline step editing ──────────────────────────────────────────
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const handleAddStep = () => {
    if (!selected) return;
    addStep(selected.id, { title: "Step Baru", prompt: "", note: "" });
  };

  const handleDeleteStep = (stepId: string) => {
    if (!selected) return;
    if (!confirm("Hapus step ini?")) return;
    deleteStep(selected.id, stepId);
    if (expandedStepId === stepId) setExpandedStepId(null);
  };

  // ─── Template creation ────────────────────────────────────────────
  const applyTemplate = (tpl: (typeof TEMPLATES)[0]) => {
    const id = addWorkflow({ name: tpl.name, description: tpl.description });
    tpl.steps.forEach((s) => addStep(id, s));
    setSelectedId(id);
  };

  // ─── Run state ────────────────────────────────────────────────────
  const [userInput, setUserInput] = useState("");
  const [runSteps, setRunSteps] = useState<RunStepState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runDone, setRunDone] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const resetRun = () => {
    setRunSteps([]);
    setRunDone(false);
  };

  const startRun = async () => {
    if (!selected || !selected.steps.length || isRunning) return;

    // Initialize all steps as pending
    const initial: RunStepState[] = selected.steps.map((s) => ({
      stepId: s.id,
      title: s.title,
      status: "pending",
      output: "",
    }));
    setRunSteps(initial);
    setRunDone(false);
    setIsRunning(true);

    const currentSteps = [...initial];
    const previousOutputs: { title: string; output: string }[] = [];

    for (let i = 0; i < selected.steps.length; i++) {
      const step = selected.steps[i];

      // Mark as running
      currentSteps[i] = { ...currentSteps[i], status: "running" };
      setRunSteps([...currentSteps]);

      try {
        const res = await fetch("/api/workflow-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: step.prompt,
            userInput,
            previousOutputs,
          }),
        });

        const data = await res.json() as { output?: string; error?: string };

        if (!res.ok || data.error) {
          currentSteps[i] = {
            ...currentSteps[i],
            status: "error",
            output: data.error ?? "Terjadi kesalahan.",
          };
          setRunSteps([...currentSteps]);
          setIsRunning(false);
          return;
        }

        const output = data.output ?? "";
        currentSteps[i] = { ...currentSteps[i], status: "done", output };
        previousOutputs.push({ title: step.title, output });
        setRunSteps([...currentSteps]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        currentSteps[i] = {
          ...currentSteps[i],
          status: "error",
          output: message,
        };
        setRunSteps([...currentSteps]);
        setIsRunning(false);
        return;
      }
    }

    setIsRunning(false);
    setRunDone(true);
  };

  const saveToHistory = () => {
    if (!selected || !runDone) return;
    addRun({
      workflowId: selected.id,
      workflowName: selected.name,
      userInput,
      steps: runSteps.map((rs) => ({
        stepId: rs.stepId,
        title: rs.title,
        output: rs.output,
        status: rs.status,
      })),
    });
  };

  const copyAllOutput = () => {
    const text = runSteps
      .map((rs) => `=== ${rs.title} ===\n${rs.output}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="AI Studio"
        title="AI Workflow Runner"
        subtitle="Rancang dan jalankan pipeline AI langkah demi langkah secara otomatis."
        actions={
          <Button onClick={openWfDialog}>
            <Icon name="plus" size={15} className="mr-1.5" />
            Workflow Baru
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* ─── LEFT PANE ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div
            className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide px-1"
            style={{ color: "var(--color-muted)" }}
          >
            <Icon name="folder" size={14} />
            Workflows
            <span
              className="ml-auto text-[11px] font-medium normal-case"
              style={{ color: "var(--color-muted-soft)" }}
            >
              {workflows.length}
            </span>
          </div>

          <AnimatePresence initial={false}>
            {workflows.map((w) => {
              const isActive = w.id === selectedId;
              return (
                <motion.div
                  key={w.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <button
                    onClick={() => { setSelectedId(w.id); resetRun(); }}
                    className="group w-full text-left rounded-[14px] p-4 transition-all"
                    style={{
                      border: isActive
                        ? "1px solid var(--color-primary)"
                        : "1px solid var(--color-hairline)",
                      background: isActive
                        ? "var(--color-primary-light)"
                        : "var(--color-surface)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div
                          className="font-semibold text-[14px] truncate"
                          style={{
                            color: isActive
                              ? "var(--color-primary-ink)"
                              : "var(--color-ink)",
                          }}
                        >
                          {w.name}
                        </div>
                        {w.description && (
                          <div
                            className="text-[12px] mt-0.5 line-clamp-2"
                            style={{ color: "var(--color-muted)" }}
                          >
                            {w.description}
                          </div>
                        )}
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWorkflow(w.id, w.name);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            handleDeleteWorkflow(w.id, w.name);
                          }
                        }}
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-[#2d1a1a]"
                        style={{ color: "var(--color-muted)" }}
                        aria-label="Hapus workflow"
                      >
                        <Icon name="trash" size={14} />
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <Icon
                        name="list-check"
                        size={13}
                        style={{ color: "var(--color-muted-soft)" }}
                      />
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {w.steps.length} step{w.steps.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Templates section */}
          <div
            className="mt-2 pt-3"
            style={{ borderTop: "1px solid var(--color-hairline)" }}
          >
            <div
              className="text-[11px] font-semibold uppercase tracking-wide px-1 mb-2"
              style={{ color: "var(--color-muted)" }}
            >
              Templates
            </div>
            <div className="flex flex-col gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => applyTemplate(tpl)}
                  className="w-full text-left rounded-[12px] p-3 transition-all hover:opacity-80"
                  style={{
                    border: "1px dashed var(--color-hairline)",
                    background: "var(--color-canvas)",
                  }}
                >
                  <div
                    className="text-[12px] font-semibold leading-snug"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {tpl.name}
                  </div>
                  <div
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {tpl.steps.length} steps
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANE ──────────────────────────────────────────── */}
        <div>
          {!selected ? (
            <Card className="flex flex-col items-center justify-center text-center py-20 px-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--color-primary-light)" }}
              >
                <Icon
                  name="workflow"
                  size={26}
                  style={{ color: "var(--color-primary-ink)" }}
                />
              </div>
              <h3
                className="text-[18px] font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                Mulai workflow pertamamu
              </h3>
              <p
                className="text-[14px] mt-1.5 max-w-sm"
                style={{ color: "var(--color-muted)" }}
              >
                Pilih template di sebelah kiri atau buat workflow baru untuk mulai.
              </p>
              <Button className="mt-5" onClick={openWfDialog}>
                <Icon name="plus" size={15} className="mr-1.5" />
                Workflow Baru
              </Button>
            </Card>
          ) : (
            <Card className="p-6">
              {/* Workflow header */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      name="sparkles"
                      size={18}
                      style={{ color: "var(--color-primary)" }}
                    />
                    <h2
                      className="text-[20px] font-semibold tracking-tight truncate"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {selected.name}
                    </h2>
                  </div>
                  {selected.description && (
                    <p
                      className="text-[13px] mt-0.5"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {selected.description}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={openWfEdit}>
                  <Icon name="edit" size={14} className="mr-1.5" />
                  Edit
                </Button>
              </div>

              <Tabs defaultValue="builder">
                <TabsList className="mb-5">
                  <TabsTrigger value="builder">Builder</TabsTrigger>
                  <TabsTrigger value="run">Jalankan</TabsTrigger>
                </TabsList>

                {/* ── BUILDER TAB ── */}
                <TabsContent value="builder">
                  {selected.steps.length === 0 ? (
                    <div
                      className="rounded-[14px] border border-dashed flex flex-col items-center text-center py-14 px-6"
                      style={{ borderColor: "var(--color-hairline)" }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                        style={{ background: "var(--color-canvas)" }}
                      >
                        <Icon
                          name="robot"
                          size={22}
                          style={{ color: "var(--color-muted)" }}
                        />
                      </div>
                      <p
                        className="text-[15px] font-medium"
                        style={{ color: "var(--color-ink)" }}
                      >
                        Belum ada step
                      </p>
                      <p
                        className="text-[13px] mt-1"
                        style={{ color: "var(--color-muted)" }}
                      >
                        Tambahkan langkah pertama untuk membangun pipeline.
                      </p>
                      <Button className="mt-4" onClick={handleAddStep}>
                        <Icon name="plus" size={15} className="mr-1.5" />
                        Tambah Step
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <AnimatePresence initial={false}>
                        {selected.steps.map((step, idx) => {
                          const isExpanded = expandedStepId === step.id;
                          return (
                            <motion.div
                              key={step.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -12 }}
                              transition={{ duration: 0.2 }}
                              className="group relative pl-12 pb-3"
                            >
                              {/* connector line */}
                              {idx < selected.steps.length - 1 && (
                                <span
                                  className="absolute left-[18px] top-9 bottom-0 w-px"
                                  style={{ background: "var(--color-hairline)" }}
                                />
                              )}
                              {/* number node */}
                              <div
                                className="absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold z-10"
                                style={{
                                  background: "var(--color-primary)",
                                  color: "var(--color-on-primary)",
                                }}
                              >
                                {idx + 1}
                              </div>

                              <div
                                className="rounded-[12px] transition-colors"
                                style={{
                                  border: "1px solid var(--color-hairline)",
                                  background: "var(--color-surface-card)",
                                }}
                              >
                                {/* Step header (click to expand) */}
                                <button
                                  className="w-full flex items-center justify-between gap-3 p-4 text-left"
                                  onClick={() =>
                                    setExpandedStepId(isExpanded ? null : step.id)
                                  }
                                >
                                  <div className="min-w-0">
                                    <span
                                      className="font-semibold text-[14px]"
                                      style={{ color: "var(--color-ink)" }}
                                    >
                                      {step.title || "(tanpa judul)"}
                                    </span>
                                    {step.note && !isExpanded && (
                                      <p
                                        className="text-[12px] mt-0.5 truncate"
                                        style={{ color: "var(--color-muted)" }}
                                      >
                                        {step.note}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <span
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteStep(step.id);
                                      }}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Hapus step"
                                        tabIndex={-1}
                                      >
                                        <Icon name="trash" size={14} />
                                      </Button>
                                    </span>
                                    <Icon
                                      name="chevron-down"
                                      size={14}
                                      style={{
                                        color: "var(--color-muted)",
                                        transform: isExpanded
                                          ? "rotate(180deg)"
                                          : "rotate(0deg)",
                                        transition: "transform 0.15s",
                                      }}
                                    />
                                  </div>
                                </button>

                                {/* Expanded edit fields */}
                                <AnimatePresence initial={false}>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.18 }}
                                      className="overflow-hidden"
                                    >
                                      <div
                                        className="px-4 pb-4 flex flex-col gap-3"
                                        style={{
                                          borderTop: "1px solid var(--color-hairline)",
                                        }}
                                      >
                                        <div className="pt-3">
                                          <label
                                            className="text-[12px] font-medium mb-1 block"
                                            style={{ color: "var(--color-muted)" }}
                                          >
                                            Judul
                                          </label>
                                          <Input
                                            value={step.title}
                                            onChange={(e) =>
                                              updateStep(selected.id, step.id, {
                                                title: e.target.value,
                                              })
                                            }
                                            placeholder="Judul step"
                                          />
                                        </div>
                                        <div>
                                          <label
                                            className="text-[12px] font-medium mb-1 block"
                                            style={{ color: "var(--color-muted)" }}
                                          >
                                            Deskripsi (opsional)
                                          </label>
                                          <Input
                                            value={step.note}
                                            onChange={(e) =>
                                              updateStep(selected.id, step.id, {
                                                note: e.target.value,
                                              })
                                            }
                                            placeholder="Catatan singkat tentang step ini"
                                          />
                                        </div>
                                        <div>
                                          <label
                                            className="text-[12px] font-medium mb-1 block"
                                            style={{ color: "var(--color-muted)" }}
                                          >
                                            Instruksi untuk AI
                                          </label>
                                          <Textarea
                                            value={step.prompt}
                                            onChange={(e) =>
                                              updateStep(selected.id, step.id, {
                                                prompt: e.target.value,
                                              })
                                            }
                                            rows={5}
                                            placeholder="Tulis instruksi untuk AI di step ini. Gunakan {{input}} untuk merujuk ke input awal user."
                                          />
                                          <p
                                            className="text-[11px] mt-1"
                                            style={{ color: "var(--color-muted-soft)" }}
                                          >
                                            Gunakan{" "}
                                            <code
                                              className="px-1 py-0.5 rounded text-[10px]"
                                              style={{
                                                background: "var(--color-canvas)",
                                                color: "var(--color-primary-ink)",
                                              }}
                                            >
                                              {"{{input}}"}
                                            </code>{" "}
                                            untuk menyisipkan input user.
                                          </p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* arrow between nodes */}
                              {idx < selected.steps.length - 1 && (
                                <div
                                  className="absolute left-[12px] -bottom-0.5 z-10"
                                  style={{ color: "var(--color-muted-soft)" }}
                                >
                                  <Icon name="chevron-down" size={14} />
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      <div className="pl-12 pt-2">
                        <Button variant="outline" onClick={handleAddStep}>
                          <Icon name="plus" size={15} className="mr-1.5" />
                          Tambah Step
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ── RUN TAB ── */}
                <TabsContent value="run">
                  {selected.steps.length === 0 ? (
                    <div
                      className="rounded-[14px] border border-dashed flex flex-col items-center text-center py-10 px-6"
                      style={{ borderColor: "var(--color-hairline)" }}
                    >
                      <p
                        className="text-[14px]"
                        style={{ color: "var(--color-muted)" }}
                      >
                        Tambahkan step di tab Builder dulu sebelum menjalankan workflow.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {/* Input */}
                      <div>
                        <label
                          className="text-[13px] font-medium mb-1.5 block"
                          style={{ color: "var(--color-ink)" }}
                        >
                          Input awal (opsional)
                        </label>
                        <Textarea
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          rows={3}
                          placeholder="Masukkan topik, konteks, atau data yang jadi input untuk seluruh workflow..."
                          disabled={isRunning}
                        />
                      </div>

                      {/* Run button */}
                      <div className="flex gap-2">
                        <Button
                          onClick={startRun}
                          disabled={isRunning}
                          className="flex items-center gap-2"
                        >
                          {isRunning ? (
                            <>
                              <Icon name="sparkles" size={15} spin className="mr-1.5" />
                              Sedang berjalan...
                            </>
                          ) : (
                            <>
                              <Icon name="sparkles" size={15} className="mr-1.5" />
                              Jalankan Workflow
                            </>
                          )}
                        </Button>
                        {runSteps.length > 0 && !isRunning && (
                          <Button
                            variant="secondary"
                            onClick={resetRun}
                          >
                            Reset
                          </Button>
                        )}
                      </div>

                      {/* Execution panel */}
                      {runSteps.length > 0 && (
                        <div className="flex flex-col gap-3">
                          {runSteps.map((rs, idx) => (
                            <div
                              key={rs.stepId}
                              className="rounded-[12px] p-4"
                              style={{
                                border: "1px solid var(--color-hairline)",
                                background:
                                  rs.status === "done"
                                    ? "var(--color-surface-card)"
                                    : rs.status === "error"
                                    ? "var(--color-surface-card)"
                                    : rs.status === "running"
                                    ? "var(--color-primary-light)"
                                    : "var(--color-canvas)",
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                  style={{
                                    background:
                                      rs.status === "done"
                                        ? "#16a34a"
                                        : rs.status === "error"
                                        ? "#dc2626"
                                        : rs.status === "running"
                                        ? "var(--color-primary)"
                                        : "var(--color-hairline)",
                                    color:
                                      rs.status === "pending"
                                        ? "var(--color-muted)"
                                        : "#fff",
                                  }}
                                >
                                  {rs.status === "done" ? "✓" : rs.status === "error" ? "✕" : idx + 1}
                                </div>
                                <span
                                  className="font-semibold text-[13px]"
                                  style={{ color: "var(--color-ink)" }}
                                >
                                  {rs.title}
                                </span>
                                {rs.status === "running" && (
                                  <span
                                    className="text-[12px] ml-1"
                                    style={{ color: "var(--color-primary-ink)" }}
                                  >
                                    Sedang diproses...
                                  </span>
                                )}
                              </div>

                              {rs.status === "done" && rs.output && (
                                <div
                                  className="mt-2 text-[13px] rounded-[8px] p-3 max-h-48 overflow-y-auto whitespace-pre-wrap"
                                  style={{
                                    background: "var(--color-canvas)",
                                    color: "var(--color-body)",
                                  }}
                                >
                                  {rs.output}
                                </div>
                              )}

                              {rs.status === "error" && (
                                <div
                                  className="mt-2 text-[13px] rounded-[8px] p-3"
                                  style={{
                                    background: "#fee2e2",
                                    color: "#b91c1c",
                                  }}
                                >
                                  {rs.output}
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Post-run actions */}
                          {runDone && (
                            <div className="flex gap-2 pt-1">
                              <Button onClick={saveToHistory}>
                                Simpan ke History
                              </Button>
                              <Button variant="secondary" onClick={copyAllOutput}>
                                Copy semua output
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Run history */}
                      {workflowRuns.length > 0 && (
                        <div className="mt-2">
                          <div
                            className="text-[12px] font-semibold uppercase tracking-wide mb-3"
                            style={{ color: "var(--color-muted)" }}
                          >
                            Riwayat Run
                          </div>
                          <div className="flex flex-col gap-2">
                            {workflowRuns.map((run) => {
                              const isExpanded = expandedRunId === run.id;
                              return (
                                <div
                                  key={run.id}
                                  className="rounded-[12px]"
                                  style={{
                                    border: "1px solid var(--color-hairline)",
                                    background: "var(--color-surface-card)",
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-2 p-3">
                                    <button
                                      className="flex-1 text-left"
                                      onClick={() =>
                                        setExpandedRunId(isExpanded ? null : run.id)
                                      }
                                    >
                                      <div
                                        className="text-[12px] font-semibold"
                                        style={{ color: "var(--color-ink)" }}
                                      >
                                        {formatDate(run.createdAt)}
                                      </div>
                                      {run.userInput && (
                                        <div
                                          className="text-[11px] mt-0.5 truncate"
                                          style={{ color: "var(--color-muted)" }}
                                        >
                                          {run.userInput}
                                        </div>
                                      )}
                                      <div
                                        className="text-[11px] mt-0.5"
                                        style={{ color: "var(--color-muted-soft)" }}
                                      >
                                        {run.steps.length} step
                                        {run.steps.length === 1 ? "" : "s"}
                                      </div>
                                    </button>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteRun(run.id)}
                                        aria-label="Hapus run"
                                      >
                                        <Icon name="trash" size={13} />
                                      </Button>
                                      <Icon
                                        name="chevron-down"
                                        size={13}
                                        style={{
                                          color: "var(--color-muted)",
                                          transform: isExpanded
                                            ? "rotate(180deg)"
                                            : "rotate(0deg)",
                                          transition: "transform 0.15s",
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <AnimatePresence initial={false}>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="overflow-hidden"
                                      >
                                        <div
                                          className="px-3 pb-3 flex flex-col gap-2"
                                          style={{
                                            borderTop: "1px solid var(--color-hairline)",
                                          }}
                                        >
                                          {run.steps.map((s) => (
                                            <div key={s.stepId} className="pt-2">
                                              <div
                                                className="text-[12px] font-semibold mb-1"
                                                style={{ color: "var(--color-ink)" }}
                                              >
                                                {s.title}
                                              </div>
                                              <div
                                                className="text-[12px] rounded-[6px] p-2 whitespace-pre-wrap max-h-32 overflow-y-auto"
                                                style={{
                                                  background: "var(--color-canvas)",
                                                  color: "var(--color-body)",
                                                }}
                                              >
                                                {s.output || "(kosong)"}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          )}
        </div>
      </div>

      {/* ─── Create workflow dialog ──────────────────────────────────── */}
      <Dialog open={wfDialogOpen} onOpenChange={setWfDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workflow Baru</DialogTitle>
            <DialogDescription>
              Beri nama dan deskripsi singkat untuk pipeline-mu.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div>
              <label
                className="text-[13px] font-medium mb-1.5 block"
                style={{ color: "var(--color-ink)" }}
              >
                Nama
              </label>
              <Input
                value={wfName}
                onChange={(e) => setWfName(e.target.value)}
                placeholder="mis. Blog Post → Social"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && submitWorkflow()}
              />
            </div>
            <div>
              <label
                className="text-[13px] font-medium mb-1.5 block"
                style={{ color: "var(--color-ink)" }}
              >
                Deskripsi
              </label>
              <Textarea
                value={wfDesc}
                onChange={(e) => setWfDesc(e.target.value)}
                placeholder="Apa yang dilakukan workflow ini?"
                rows={3}
              />
            </div>
          </div>
          <div
            className="px-6 py-4 flex justify-end gap-2.5"
            style={{ borderTop: "1px solid var(--color-hairline)" }}
          >
            <Button variant="secondary" onClick={() => setWfDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitWorkflow} disabled={!wfName.trim()}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit workflow dialog ────────────────────────────────────── */}
      <Dialog open={wfEditOpen} onOpenChange={setWfEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>Ubah nama dan deskripsi.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div>
              <label
                className="text-[13px] font-medium mb-1.5 block"
                style={{ color: "var(--color-ink)" }}
              >
                Nama
              </label>
              <Input
                value={wfEditName}
                onChange={(e) => setWfEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label
                className="text-[13px] font-medium mb-1.5 block"
                style={{ color: "var(--color-ink)" }}
              >
                Deskripsi
              </label>
              <Textarea
                value={wfEditDesc}
                onChange={(e) => setWfEditDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div
            className="px-6 py-4 flex justify-end gap-2.5"
            style={{ borderTop: "1px solid var(--color-hairline)" }}
          >
            <Button variant="secondary" onClick={() => setWfEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitWfEdit} disabled={!wfEditName.trim()}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}
