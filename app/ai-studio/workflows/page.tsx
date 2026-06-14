"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWorkflowStore, type WorkflowStep } from "@/lib/aiStore";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

const TOOL_OPTIONS = ["Claude", "Image Gen", "Vision", "Code", "Custom"] as const;

function toolBadgeVariant(tool: string): "teal" | "purple" | "low" | "medium" | "gray" {
  switch (tool) {
    case "Claude":
      return "teal";
    case "Image Gen":
      return "purple";
    case "Vision":
      return "medium";
    case "Code":
      return "low";
    default:
      return "gray";
  }
}

export default function WorkflowBuilderPage() {
  const {
    workflows,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    addStep,
    updateStep,
    deleteStep,
  } = useWorkflowStore();

  // Default-select first workflow on mount (guard for empty)
  const [selectedId, setSelectedId] = useState<string | null>(
    () => workflows[0]?.id ?? null
  );

  const selected = useMemo(
    () => workflows.find((w) => w.id === selectedId) ?? null,
    [workflows, selectedId]
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

  // ─── Edit workflow (inline) dialog ────────────────────────────────
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

  // ─── Step dialog (add / edit) ─────────────────────────────────────
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [stepTool, setStepTool] = useState<string>(TOOL_OPTIONS[0]);
  const [stepCustomTool, setStepCustomTool] = useState("");
  const [stepNote, setStepNote] = useState("");

  const openAddStep = () => {
    setEditingStep(null);
    setStepTitle("");
    setStepTool(TOOL_OPTIONS[0]);
    setStepCustomTool("");
    setStepNote("");
    setStepDialogOpen(true);
  };

  const openEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setStepTitle(step.title);
    const known = (TOOL_OPTIONS as readonly string[]).includes(step.tool);
    setStepTool(known ? step.tool : "Custom");
    setStepCustomTool(known ? "" : step.tool);
    setStepNote(step.note);
    setStepDialogOpen(true);
  };

  const submitStep = () => {
    if (!selected) return;
    const title = stepTitle.trim();
    if (!title) return;
    const tool =
      stepTool === "Custom" ? stepCustomTool.trim() || "Custom" : stepTool;
    const payload = { title, tool, note: stepNote.trim() };
    if (editingStep) {
      updateStep(selected.id, editingStep.id, payload);
    } else {
      addStep(selected.id, payload);
    }
    setStepDialogOpen(false);
  };

  const handleDeleteWorkflow = (id: string, name: string) => {
    if (!confirm(`Hapus workflow "${name}"?`)) return;
    deleteWorkflow(id);
    if (selectedId === id) {
      const remaining = workflows.filter((w) => w.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
  };

  const handleDeleteStep = (stepId: string) => {
    if (!selected) return;
    if (!confirm("Hapus step ini?")) return;
    deleteStep(selected.id, stepId);
  };

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="AI Studio"
        title="AI Workflow Builder"
        subtitle="Rancang pipeline AI langkah demi langkah, dari ide sampai output."
        actions={
          <Button onClick={openWfDialog}>
            <Icon name="plus" size={15} className="mr-1.5" />
            Workflow Baru
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* ─── LEFT PANE: workflow list ─────────────────────────────── */}
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
                    onClick={() => setSelectedId(w.id)}
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
        </div>

        {/* ─── RIGHT PANE: builder ──────────────────────────────────── */}
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
                Buat pipeline AI yang menghubungkan beberapa langkah jadi alur
                kerja otomatis.
              </p>
              <Button className="mt-5" onClick={openWfDialog}>
                <Icon name="plus" size={15} className="mr-1.5" />
                Workflow Baru
              </Button>
            </Card>
          ) : (
            <Card className="p-6">
              {/* Workflow header */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      name="sparkles"
                      size={18}
                      style={{ color: "var(--color-primary)" }}
                    />
                    <h2
                      className="text-[22px] font-semibold tracking-tight truncate"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {selected.name}
                    </h2>
                  </div>
                  {selected.description && (
                    <p
                      className="text-[14px] mt-1"
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

              {/* Steps pipeline */}
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
                  <Button className="mt-4" onClick={openAddStep}>
                    <Icon name="plus" size={15} className="mr-1.5" />
                    Tambah Step
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <AnimatePresence initial={false}>
                    {selected.steps.map((step, idx) => (
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
                          className="rounded-[12px] p-4 transition-colors"
                          style={{
                            border: "1px solid var(--color-hairline)",
                            background: "var(--color-surface-card)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="font-semibold text-[14px]"
                                  style={{ color: "var(--color-ink)" }}
                                >
                                  {step.title}
                                </span>
                                <Badge variant={toolBadgeVariant(step.tool)}>
                                  {step.tool}
                                </Badge>
                              </div>
                              {step.note && (
                                <p
                                  className="text-[13px] mt-1.5"
                                  style={{ color: "var(--color-muted)" }}
                                >
                                  {step.note}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditStep(step)}
                                aria-label="Edit step"
                              >
                                <Icon name="edit" size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteStep(step.id)}
                                aria-label="Hapus step"
                              >
                                <Icon name="trash" size={14} />
                              </Button>
                            </div>
                          </div>
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
                    ))}
                  </AnimatePresence>

                  <div className="pl-12 pt-2">
                    <Button variant="outline" onClick={openAddStep}>
                      <Icon name="plus" size={15} className="mr-1.5" />
                      Tambah Step
                    </Button>
                  </div>
                </div>
              )}
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

      {/* ─── Step dialog (add / edit) ────────────────────────────────── */}
      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStep ? "Edit Step" : "Tambah Step"}</DialogTitle>
            <DialogDescription>
              Tentukan aksi, tool yang dipakai, dan catatan.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div>
              <label
                className="text-[13px] font-medium mb-1.5 block"
                style={{ color: "var(--color-ink)" }}
              >
                Judul
              </label>
              <Input
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
                placeholder="mis. Ringkas artikel"
                autoFocus
              />
            </div>
            <div>
              <label
                className="text-[13px] font-medium mb-1.5 block"
                style={{ color: "var(--color-ink)" }}
              >
                Tool
              </label>
              <Select
                value={stepTool}
                onChange={(e) => setStepTool(e.target.value)}
              >
                {TOOL_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              {stepTool === "Custom" && (
                <Input
                  className="mt-2"
                  value={stepCustomTool}
                  onChange={(e) => setStepCustomTool(e.target.value)}
                  placeholder="Nama tool custom"
                />
              )}
            </div>
            <div>
              <label
                className="text-[13px] font-medium mb-1.5 block"
                style={{ color: "var(--color-ink)" }}
              >
                Catatan
              </label>
              <Textarea
                value={stepNote}
                onChange={(e) => setStepNote(e.target.value)}
                placeholder="Detail atau instruksi untuk step ini"
                rows={3}
              />
            </div>
          </div>
          <div
            className="px-6 py-4 flex justify-end gap-2.5"
            style={{ borderTop: "1px solid var(--color-hairline)" }}
          >
            <Button variant="secondary" onClick={() => setStepDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitStep} disabled={!stepTitle.trim()}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}
