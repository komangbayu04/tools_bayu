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
import {
  useWorkflowStore,
  useWorkflowRunStore,
} from "@/lib/aiStore";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RunStepState {
  stepId: string;
  title: string;
  status: "pending" | "running" | "done" | "error";
  output: string;
}

// ─── Template definitions ─────────────────────────────────────────────────────
const TEMPLATES = [
  {
    name: "Content Brief → Caption → Hashtag",
    description: "Pipeline konten media sosial dari brief sampai hashtag.",
    steps: [
      {
        title: "Content Brief",
        prompt:
          "Buat content brief singkat untuk topik: {{input}}. Sertakan target audience, pesan utama, dan tone of voice.",
        note: "Membuat brief konten dari topik yang diberikan",
      },
      {
        title: "Caption",
        prompt:
          "Berdasarkan content brief di atas, buat caption media sosial yang engaging (max 150 kata).",
        note: "Menulis caption berdasarkan brief",
      },
      {
        title: "Hashtag",
        prompt:
          "Berdasarkan caption yang sudah dibuat, rekomendasikan 15-20 hashtag relevan yang trending.",
        note: "Menghasilkan hashtag relevan",
      },
    ],
  },
  {
    name: "Riset Topik → Outline → Draft",
    description: "Dari riset topik langsung ke draft artikel.",
    steps: [
      {
        title: "Riset Topik",
        prompt:
          "Lakukan riset mendalam untuk topik: {{input}}. Temukan poin-poin penting, fakta menarik, dan sudut pandang unik yang bisa diangkat.",
        note: "Mengumpulkan bahan riset dari topik",
      },
      {
        title: "Outline",
        prompt:
          "Berdasarkan hasil riset di atas, buat outline artikel yang terstruktur dengan heading dan sub-heading yang logis.",
        note: "Membuat kerangka artikel",
      },
      {
        title: "Draft Artikel",
        prompt:
          "Tulis draft artikel lengkap berdasarkan outline di atas. Gunakan bahasa yang engaging, informatif, dan mudah dipahami.",
        note: "Menulis draft artikel dari outline",
      },
    ],
  },
  {
    name: "Analisis Kompetitor → SWOT → Rekomendasi",
    description: "Analisis bisnis dari kompetitor sampai rekomendasi strategis.",
    steps: [
      {
        title: "Analisis Kompetitor",
        prompt:
          "Lakukan analisis kompetitor untuk: {{input}}. Identifikasi pemain utama di industri ini, produk/layanan mereka, dan positioning di pasar.",
        note: "Menganalisis kompetitor di industri",
      },
      {
        title: "Analisis SWOT",
        prompt:
          "Berdasarkan analisis kompetitor di atas, buat analisis SWOT yang komprehensif untuk bisnis/produk yang dianalisis.",
        note: "Menyusun SWOT dari analisis kompetitor",
      },
      {
        title: "Rekomendasi Strategis",
        prompt:
          "Berdasarkan analisis SWOT di atas, berikan 5-7 rekomendasi strategis yang actionable dan spesifik untuk meningkatkan daya saing.",
        note: "Membuat rekomendasi berdasarkan SWOT",
      },
    ],
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
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

  const [activeTab, setActiveTab] = useState<"builder" | "jalankan">("builder");
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  // ─── Create workflow dialog ──────────────────────────────────────────────
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

  // ─── Edit workflow dialog ────────────────────────────────────────────────
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

  const handleAddStep = () => {
    if (!selected) return;
    addStep(selected.id, {
      title: `Step ${selected.steps.length + 1}`,
      prompt: "",
      note: "",
    });
  };

  const handleDeleteStep = (stepId: string) => {
    if (!selected) return;
    if (!confirm("Hapus step ini?")) return;
    deleteStep(selected.id, stepId);
    if (expandedStepId === stepId) setExpandedStepId(null);
  };

  const handleLoadTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    const id = addWorkflow({ name: tpl.name, description: tpl.description });
    tpl.steps.forEach((s) => {
      addStep(id, s);
    });
    setSelectedId(id);
    setActiveTab("builder");
  };

  // ─── Run workflow ────────────────────────────────────────────────────────
  const [userInput, setUserInput] = useState("");
  const [runSteps, setRunSteps] = useState<RunStepState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runDone, setRunDone] = useState(false);
  const [expandedRunIds, setExpandedRunIds] = useState<Set<string>>(new Set());

  const workflowRuns = useMemo(
    () => runs.filter((r) => r.workflowId === selectedId),
    [runs, selectedId]
  );

  const handleRunWorkflow = async () => {
    if (!selected || selected.steps.length === 0) return;

    const initial: RunStepState[] = selected.steps.map((s) => ({
      stepId: s.id,
      title: s.title,
      status: "pending",
      output: "",
    }));
    setRunSteps(initial);
    setIsRunning(true);
    setRunDone(false);

    const completed: RunStepState[] = [];

    for (let i = 0; i < selected.steps.length; i++) {
      const step = selected.steps[i];

      setRunSteps((prev) =>
        prev.map((rs) =>
          rs.stepId === step.id ? { ...rs, status: "running" } : rs
        )
      );

      const previousOutputs = completed.map((c) => ({
        title: c.title,
        output: c.output,
      }));

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

        const data = (await res.json()) as { output?: string; error?: string };

        if (!res.ok || data.error) {
          const errMsg = data.error ?? "Terjadi kesalahan.";
          setRunSteps((prev) =>
            prev.map((rs) =>
              rs.stepId === step.id
                ? { ...rs, status: "error", output: errMsg }
                : rs
            )
          );
          setIsRunning(false);
          return;
        }

        const doneStep: RunStepState = {
          stepId: step.id,
          title: step.title,
          status: "done",
          output: data.output ?? "",
        };
        completed.push(doneStep);

        setRunSteps((prev) =>
          prev.map((rs) => (rs.stepId === step.id ? doneStep : rs))
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setRunSteps((prev) =>
          prev.map((rs) =>
            rs.stepId === step.id
              ? { ...rs, status: "error", output: msg }
              : rs
          )
        );
        setIsRunning(false);
        return;
      }
    }

    setIsRunning(false);
    setRunDone(true);
  };

  const handleSaveRun = () => {
    if (!selected) return;
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
    setRunDone(false);
    setRunSteps([]);
  };

  const handleCopyAll = () => {
    const text = runSteps
      .map((rs, i) => `## Step ${i + 1}: ${rs.title}\n\n${rs.output}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
  };

  const toggleExpandRun = (id: string) => {
    setExpandedRunIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="AI Studio"
        title="AI Workflow Runner"
        subtitle="Bangun pipeline AI multi-step dan jalankan langsung dari browser."
        actions={
          <Button onClick={openWfDialog}>
            <Icon name="plus" size={15} className="mr-1.5" />
            Workflow Baru
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
        {/* ─── LEFT PANEL ──────────────────────────────────────────────── */}
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
                    onClick={() => {
                      setSelectedId(w.id);
                      setRunSteps([]);
                      setRunDone(false);
                    }}
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

          {workflows.length === 0 && (
            <Card className="p-5 text-center">
              <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                Belum ada workflow.
              </p>
            </Card>
          )}

          {/* Templates */}
          <div
            className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide px-1 mt-4"
            style={{ color: "var(--color-muted)" }}
          >
            <Icon name="sparkles" size={14} />
            Templates
          </div>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.name}
              onClick={() => handleLoadTemplate(tpl)}
              className="w-full text-left rounded-[14px] p-4 transition-all hover:opacity-80"
              style={{
                border: "1px solid var(--color-hairline)",
                background: "var(--color-canvas)",
              }}
            >
              <div
                className="font-medium text-[13px]"
                style={{ color: "var(--color-ink)" }}
              >
                {tpl.name}
              </div>
              <div
                className="text-[12px] mt-0.5 line-clamp-2"
                style={{ color: "var(--color-muted)" }}
              >
                {tpl.description}
              </div>
            </button>
          ))}
        </div>

        {/* ─── RIGHT PANEL ─────────────────────────────────────────────── */}
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
                Pilih atau buat workflow
              </h3>
              <p
                className="text-[14px] mt-1.5 max-w-sm"
                style={{ color: "var(--color-muted)" }}
              >
                Pilih workflow dari daftar kiri, atau mulai dari template yang
                tersedia.
              </p>
              <Button className="mt-5" onClick={openWfDialog}>
                <Icon name="plus" size={15} className="mr-1.5" />
                Workflow Baru
              </Button>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              {/* Workflow header + tabs */}
              <div
                className="px-6 pt-6 pb-4"
                style={{ borderBottom: "1px solid var(--color-hairline)" }}
              >
                <div className="flex items-start justify-between gap-3">
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
                        className="text-[13px] mt-1"
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

                <div className="flex gap-1 mt-4">
                  {(["builder", "jalankan"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="px-4 py-1.5 rounded-full text-[13px] font-medium transition-all"
                      style={{
                        background:
                          activeTab === tab
                            ? "var(--color-primary)"
                            : "transparent",
                        color:
                          activeTab === tab
                            ? "var(--color-on-primary)"
                            : "var(--color-muted)",
                      }}
                    >
                      {tab === "builder" ? "Builder" : "Jalankan"}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── BUILDER TAB ──────────────────────────────────────── */}
              {activeTab === "builder" && (
                <div className="p-6">
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
                              {idx < selected.steps.length - 1 && (
                                <span
                                  className="absolute left-[18px] top-9 bottom-0 w-px"
                                  style={{ background: "var(--color-hairline)" }}
                                />
                              )}

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
                                  border: isExpanded
                                    ? "1px solid var(--color-primary)"
                                    : "1px solid var(--color-hairline)",
                                  background: "var(--color-surface-card)",
                                }}
                              >
                                <button
                                  className="w-full text-left p-4 flex items-center justify-between gap-3"
                                  onClick={() =>
                                    setExpandedStepId(isExpanded ? null : step.id)
                                  }
                                >
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className="font-semibold text-[14px]"
                                      style={{ color: "var(--color-ink)" }}
                                    >
                                      {step.title || `Step ${idx + 1}`}
                                    </div>
                                    {step.note && !isExpanded && (
                                      <div
                                        className="text-[12px] mt-0.5 truncate"
                                        style={{ color: "var(--color-muted)" }}
                                      >
                                        {step.note}
                                      </div>
                                    )}
                                    {step.prompt && !isExpanded && (
                                      <div
                                        className="text-[12px] mt-0.5 truncate opacity-60"
                                        style={{ color: "var(--color-muted)" }}
                                      >
                                        {step.prompt}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteStep(step.id);
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.stopPropagation();
                                          handleDeleteStep(step.id);
                                        }
                                      }}
                                      aria-label="Hapus step"
                                    >
                                      <Icon
                                        name="trash"
                                        size={14}
                                        style={{ color: "var(--color-muted)" }}
                                      />
                                    </span>
                                    <Icon
                                      name={isExpanded ? "chevron-up" : "chevron-down"}
                                      size={14}
                                      style={{ color: "var(--color-muted)" }}
                                    />
                                  </div>
                                </button>

                                {isExpanded && (
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
                                        Catatan (opsional)
                                      </label>
                                      <Input
                                        value={step.note}
                                        onChange={(e) =>
                                          updateStep(selected.id, step.id, {
                                            note: e.target.value,
                                          })
                                        }
                                        placeholder="Deskripsi singkat step ini"
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
                                        placeholder="Tulis prompt untuk AI, gunakan {{input}} untuk menyisipkan input awal user."
                                        rows={4}
                                      />
                                      <p
                                        className="text-[11px] mt-1"
                                        style={{ color: "var(--color-muted-soft)" }}
                                      >
                                        Gunakan{" "}
                                        <code
                                          className="px-1 rounded"
                                          style={{ background: "var(--color-canvas)" }}
                                        >
                                          {"{{input}}"}
                                        </code>{" "}
                                        untuk menyisipkan input user ke prompt.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>

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
                </div>
              )}

              {/* ─── JALANKAN TAB ─────────────────────────────────────── */}
              {activeTab === "jalankan" && (
                <div className="p-6 flex flex-col gap-5">
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
                      placeholder="Masukkan topik, konteks, atau data awal untuk workflow ini..."
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleRunWorkflow}
                    disabled={isRunning || selected.steps.length === 0}
                    className="self-start"
                  >
                    {isRunning ? (
                      <>
                        <span className="mr-2 animate-spin inline-block">
                          <Icon name="loader" size={15} />
                        </span>
                        Sedang berjalan...
                      </>
                    ) : (
                      <>
                        <Icon name="play" size={15} className="mr-1.5" />
                        Jalankan Workflow
                      </>
                    )}
                  </Button>

                  {runSteps.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {runSteps.map((rs, idx) => (
                        <div
                          key={rs.stepId}
                          className="rounded-[12px] p-4"
                          style={{
                            border:
                              rs.status === "done"
                                ? "1px solid #22c55e"
                                : rs.status === "error"
                                ? "1px solid #ef4444"
                                : rs.status === "running"
                                ? "1px solid var(--color-primary)"
                                : "1px solid var(--color-hairline)",
                            background:
                              rs.status === "done"
                                ? "rgba(34,197,94,0.06)"
                                : rs.status === "error"
                                ? "rgba(239,68,68,0.06)"
                                : rs.status === "running"
                                ? "var(--color-primary-light)"
                                : "var(--color-surface)",
                          }}
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                              style={{
                                background:
                                  rs.status === "done"
                                    ? "#22c55e"
                                    : rs.status === "error"
                                    ? "#ef4444"
                                    : rs.status === "running"
                                    ? "var(--color-primary)"
                                    : "var(--color-hairline)",
                                color:
                                  rs.status === "pending"
                                    ? "var(--color-muted)"
                                    : "#fff",
                              }}
                            >
                              {rs.status === "done" ? (
                                <Icon name="check" size={12} />
                              ) : rs.status === "error" ? (
                                <Icon name="x" size={12} />
                              ) : rs.status === "running" ? (
                                <span className="animate-spin inline-block">
                                  <Icon name="loader" size={11} />
                                </span>
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className="font-semibold text-[14px]"
                              style={{ color: "var(--color-ink)" }}
                            >
                              {rs.title}
                            </span>
                            {rs.status === "running" && (
                              <span
                                className="text-[12px]"
                                style={{ color: "var(--color-primary)" }}
                              >
                                Sedang diproses...
                              </span>
                            )}
                          </div>

                          {rs.status === "done" && rs.output && (
                            <div
                              className="rounded-[8px] p-3 max-h-48 overflow-y-auto text-[13px] whitespace-pre-wrap"
                              style={{
                                background: "var(--color-canvas)",
                                color: "var(--color-ink)",
                                lineHeight: "1.6",
                              }}
                            >
                              {rs.output}
                            </div>
                          )}

                          {rs.status === "error" && rs.output && (
                            <div
                              className="rounded-[8px] p-3 text-[13px]"
                              style={{
                                background: "rgba(239,68,68,0.08)",
                                color: "#ef4444",
                              }}
                            >
                              {rs.output}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {runDone && (
                    <div className="flex items-center gap-3">
                      <Button onClick={handleSaveRun}>
                        <Icon name="save" size={14} className="mr-1.5" />
                        Simpan ke History
                      </Button>
                      <Button variant="outline" onClick={handleCopyAll}>
                        <Icon name="copy" size={14} className="mr-1.5" />
                        Copy semua output
                      </Button>
                    </div>
                  )}

                  {workflowRuns.length > 0 && (
                    <div>
                      <div
                        className="text-[12px] font-semibold uppercase tracking-wide mb-3"
                        style={{ color: "var(--color-muted)" }}
                      >
                        Riwayat Run ({workflowRuns.length})
                      </div>
                      <div className="flex flex-col gap-2">
                        {workflowRuns.map((run) => {
                          const isExpanded = expandedRunIds.has(run.id);
                          return (
                            <div
                              key={run.id}
                              className="rounded-[12px]"
                              style={{
                                border: "1px solid var(--color-hairline)",
                                background: "var(--color-surface)",
                              }}
                            >
                              <button
                                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                                onClick={() => toggleExpandRun(run.id)}
                              >
                                <div className="min-w-0">
                                  <div
                                    className="text-[13px] font-medium"
                                    style={{ color: "var(--color-ink)" }}
                                  >
                                    {new Date(run.createdAt).toLocaleString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                  {run.userInput && (
                                    <div
                                      className="text-[12px] truncate mt-0.5"
                                      style={{ color: "var(--color-muted)" }}
                                    >
                                      Input: {run.userInput}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteRun(run.id);
                                    }}
                                    className="hover:text-red-500 transition-colors"
                                    style={{ color: "var(--color-muted)" }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.stopPropagation();
                                        deleteRun(run.id);
                                      }
                                    }}
                                    aria-label="Hapus run"
                                  >
                                    <Icon name="trash" size={13} />
                                  </span>
                                  <Icon
                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                    size={13}
                                    style={{ color: "var(--color-muted)" }}
                                  />
                                </div>
                              </button>

                              {isExpanded && (
                                <div
                                  className="px-4 pb-4 flex flex-col gap-3"
                                  style={{
                                    borderTop: "1px solid var(--color-hairline)",
                                  }}
                                >
                                  {run.steps.map((rs, i) => (
                                    <div key={rs.stepId} className="pt-3">
                                      <div
                                        className="text-[12px] font-semibold mb-1"
                                        style={{ color: "var(--color-muted)" }}
                                      >
                                        Step {i + 1}: {rs.title}
                                      </div>
                                      <div
                                        className="rounded-[8px] p-3 text-[13px] whitespace-pre-wrap max-h-40 overflow-y-auto"
                                        style={{
                                          background: "var(--color-canvas)",
                                          color: "var(--color-ink)",
                                        }}
                                      >
                                        {rs.output || "(tidak ada output)"}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ─── Create workflow dialog ──────────────────────────────────────── */}
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

      {/* ─── Edit workflow dialog ────────────────────────────────────────── */}
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
