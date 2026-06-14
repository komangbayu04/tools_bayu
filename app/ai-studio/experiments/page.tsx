"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import {
  useExperimentStore,
  type Experiment,
  type ExperimentStatus,
} from "@/lib/aiStore";

// ─── Status config ────────────────────────────────────────────────
const STATUS_META: Record<
  ExperimentStatus,
  { label: string; color: string; icon: "lightbulb" | "spinner" | "check-circle" | "alert-triangle" }
> = {
  idea: { label: "Ide", color: "#6D8DF0", icon: "lightbulb" },
  running: { label: "Berjalan", color: "#E8A55A", icon: "spinner" },
  success: { label: "Sukses", color: "#5DB872", icon: "check-circle" },
  failed: { label: "Gagal", color: "#C64545", icon: "alert-triangle" },
};

const STATUS_ORDER: ExperimentStatus[] = ["idea", "running", "success", "failed"];
const GOLD = "#E8A55A";

const tint = (hex: string, pct: number) => `color-mix(in srgb, ${hex} ${pct}%, transparent)`;

// ─── Star rating ──────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  size = 15,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={!onChange}
            onClick={(e) => {
              e.stopPropagation();
              // click same star to clear back to that star - 1
              onChange?.(value === n ? n - 1 : n);
            }}
            className={onChange ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
            style={{ color: filled ? GOLD : "var(--color-muted-soft)", lineHeight: 0 }}
            aria-label={`${n} bintang`}
          >
            <Icon name="star" size={size} />
          </button>
        );
      })}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────
function StatusBadge({
  status,
  onCycle,
}: {
  status: ExperimentStatus;
  onCycle?: () => void;
}) {
  const meta = STATUS_META[status];
  return (
    <button
      type="button"
      disabled={!onCycle}
      onClick={(e) => {
        e.stopPropagation();
        onCycle?.();
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
        onCycle ? "cursor-pointer hover:brightness-95" : "cursor-default"
      }`}
      style={{ background: tint(meta.color, 14), color: meta.color }}
      title={onCycle ? "Klik untuk ganti status" : undefined}
    >
      <Icon name={meta.icon} size={11} spin={status === "running"} />
      {meta.label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────
type Editing = Experiment | "new" | null;

const emptyForm = {
  title: "",
  model: "Claude Opus 4.8",
  prompt: "",
  result: "",
  rating: 0,
  status: "idea" as ExperimentStatus,
};

export default function ExperimentsPage() {
  const { experiments, addExperiment, updateExperiment, deleteExperiment } = useExperimentStore();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ExperimentStatus>("all");
  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState(emptyForm);

  // Stats
  const stats = useMemo(() => {
    const counts: Record<ExperimentStatus, number> = { idea: 0, running: 0, success: 0, failed: 0 };
    let ratingSum = 0;
    let ratedCount = 0;
    for (const e of experiments) {
      counts[e.status]++;
      if (e.rating > 0) {
        ratingSum += e.rating;
        ratedCount++;
      }
    }
    return {
      counts,
      total: experiments.length,
      avgRating: ratedCount ? ratingSum / ratedCount : 0,
    };
  }, [experiments]);

  // Filtered + searched list
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return experiments.filter((e) => {
      if (filter !== "all" && e.status !== filter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.model.toLowerCase().includes(q) ||
        e.prompt.toLowerCase().includes(q)
      );
    });
  }, [experiments, query, filter]);

  // Dialog open helpers
  const openNew = () => {
    setForm(emptyForm);
    setEditing("new");
  };
  const openEdit = (e: Experiment) => {
    setForm({
      title: e.title,
      model: e.model,
      prompt: e.prompt,
      result: e.result,
      rating: e.rating,
      status: e.status,
    });
    setEditing(e);
  };
  const closeDialog = () => setEditing(null);

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing === "new") {
      addExperiment({ ...form, title: form.title.trim(), model: form.model.trim() });
    } else if (editing) {
      updateExperiment(editing.id, { ...form, title: form.title.trim(), model: form.model.trim() });
    }
    closeDialog();
  };

  const cycleStatus = (e: Experiment) => {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(e.status) + 1) % STATUS_ORDER.length];
    updateExperiment(e.id, { status: next });
  };

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="AI Studio"
        title="AI Experiments"
        subtitle="Jurnal lab untuk mencatat & menilai eksperimen prompt"
        actions={
          <Button onClick={openNew}>
            <Icon name="plus" size={15} />
            Eksperimen Baru
          </Button>
        }
      />

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
          style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}
        >
          <Icon name="flask" size={13} />
          {stats.total} Total
        </span>
        {STATUS_ORDER.map((s) => {
          const meta = STATUS_META[s];
          return (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{ background: tint(meta.color, 12), color: meta.color }}
            >
              <Icon name={meta.icon} size={12} />
              {stats.counts[s]} {meta.label}
            </span>
          );
        })}
        {stats.avgRating > 0 && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold ml-auto"
            style={{ background: tint(GOLD, 14), color: GOLD }}
          >
            <Icon name="star" size={12} />
            {stats.avgRating.toFixed(1)} rata-rata
          </span>
        )}
      </motion.div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", ...STATUS_ORDER] as const).map((f) => {
            const active = filter === f;
            const label = f === "all" ? "Semua" : STATUS_META[f].label;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border"
                style={
                  active
                    ? {
                        background: "var(--color-primary)",
                        color: "var(--color-on-primary)",
                        borderColor: "var(--color-primary)",
                      }
                    : {
                        background: "var(--color-surface-card)",
                        color: "var(--color-muted)",
                        borderColor: "var(--color-hairline)",
                      }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <Icon
            name="search"
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-muted-soft)" }}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul, model, prompt..."
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center text-center py-20 rounded-[16px] border border-dashed"
          style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}
          >
            <Icon name="flask" size={24} />
          </div>
          <p className="text-[15px] font-semibold" style={{ color: "var(--color-ink)" }}>
            {experiments.length === 0 ? "Belum ada eksperimen" : "Tidak ada hasil"}
          </p>
          <p className="text-[13px] mt-1 max-w-xs" style={{ color: "var(--color-muted)" }}>
            {experiments.length === 0
              ? "Mulai catat eksperimen prompt pertamamu untuk melacak apa yang berhasil."
              : "Coba ubah filter atau kata kunci pencarian."}
          </p>
          {experiments.length === 0 && (
            <Button className="mt-5" onClick={openNew}>
              <Icon name="plus" size={15} />
              Eksperimen Baru
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {visible.map((e) => (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group relative p-5 h-full flex flex-col">
                  {/* Hover actions */}
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => openEdit(e)}
                      aria-label="Edit"
                    >
                      <Icon name="edit" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 hover:text-[#C64545]"
                      onClick={() => deleteExperiment(e.id)}
                      aria-label="Hapus"
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </div>

                  {/* Header */}
                  <div className="flex items-start gap-2 pr-16 mb-3">
                    <StatusBadge status={e.status} onCycle={() => cycleStatus(e)} />
                  </div>
                  <h3
                    className="text-[15px] font-semibold leading-snug pr-16 -mt-1 mb-2"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {e.title}
                  </h3>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="teal">
                      <Icon name="robot" size={10} className="mr-1" />
                      {e.model}
                    </Badge>
                    <StarRating value={e.rating} onChange={(v) => updateExperiment(e.id, { rating: v })} />
                  </div>

                  {/* Prompt */}
                  {e.prompt && (
                    <p
                      className="text-[12.5px] font-mono leading-relaxed mb-3 px-3 py-2 rounded-[10px] line-clamp-3"
                      style={{ background: "var(--color-canvas)", color: "var(--color-body)" }}
                    >
                      {e.prompt}
                    </p>
                  )}

                  {/* Result */}
                  {e.result && (
                    <p
                      className="text-[13px] leading-relaxed line-clamp-3 mb-3"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {e.result}
                    </p>
                  )}

                  {/* Footer */}
                  <div
                    className="mt-auto pt-3 text-[11.5px] flex items-center gap-1.5 border-t"
                    style={{ borderColor: "var(--color-hairline)", color: "var(--color-muted-soft)" }}
                  >
                    <Icon name="clock" size={11} />
                    {format(new Date(e.createdAt), "d MMM yyyy", { locale: idLocale })}
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Eksperimen Baru" : "Edit Eksperimen"}</DialogTitle>
            <DialogDescription>
              Catat detail eksperimen prompt dan hasilnya.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-body)" }}>
                Judul
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="cth. Few-shot vs zero-shot"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-body)" }}>
                  Model
                </label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                  placeholder="Claude Opus 4.8"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-body)" }}>
                  Status
                </label>
                <Select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ExperimentStatus }))}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-body)" }}>
                Prompt
              </label>
              <Textarea
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                placeholder="Prompt yang diuji..."
                rows={3}
                className="font-mono text-[12.5px]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-body)" }}>
                Hasil
              </label>
              <Textarea
                value={form.result}
                onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))}
                placeholder="Apa yang terjadi? Temuan / catatan..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-body)" }}>
                Rating
              </label>
              <StarRating
                value={form.rating}
                onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                size={20}
              />
            </div>
          </div>

          <div
            className="px-6 py-4 flex items-center justify-end gap-2.5"
            style={{ borderTop: "1px solid var(--color-hairline)" }}
          >
            <Button variant="secondary" onClick={closeDialog}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={!form.title.trim()}>
              <Icon name="check" size={15} />
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}
