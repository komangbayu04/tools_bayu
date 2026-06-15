"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import type { AnalysisMode } from "@/app/api/design-assistant/route";

// ─── Mode config ──────────────────────────────────────────────────
const MODES: { id: AnalysisMode; label: string; icon: string; color: string; desc: string }[] = [
  { id: "critique", label: "Design Critique", icon: "✦", color: "#7c3aed", desc: "Kekuatan, masalah, dan saran perbaikan menyeluruh" },
  { id: "palette", label: "Palet & Tipografi", icon: "◉", color: "#0ea5e9", desc: "Analisis warna, harmoni, dan tipografi" },
  { id: "consistency", label: "Konsistensi & A11y", icon: "⊞", color: "#16a34a", desc: "Inkonsistensi UI dan masalah aksesibilitas" },
  { id: "layout", label: "Layout & Hierarki", icon: "▤", color: "#ea580c", desc: "Komposisi, grid, dan visual flow" },
];

// ─── Score badge ──────────────────────────────────────────────────
function Score({ value, label }: { value: number; label: string }) {
  const color = value >= 8 ? "#16a34a" : value >= 6 ? "#d97706" : "#dc2626";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-[22px] font-black"
        style={{ background: `${color}15`, color }}
      >
        {value}
      </div>
      <span className="text-[11px] font-medium text-center leading-tight" style={{ color: "var(--color-muted-soft)" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Severity badge ───────────────────────────────────────────────
function SeverityBadge({ level }: { level: "high" | "medium" | "low" }) {
  const map = {
    high: { label: "Kritis", bg: "#fef2f2", color: "#dc2626" },
    medium: { label: "Sedang", bg: "#fffbeb", color: "#d97706" },
    low: { label: "Minor", bg: "#f0fdf4", color: "#16a34a" },
  };
  const { label, bg, color } = map[level] ?? map.low;
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
      {label}
    </span>
  );
}

// ─── Colour chip ─────────────────────────────────────────────────
function ColorChip({ hex, role, note }: { hex: string; role: string; note?: string }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}>
      <div className="w-9 h-9 rounded-lg flex-shrink-0 border" style={{ background: hex, borderColor: "var(--color-hairline)" }} />
      <div className="min-w-0">
        <p className="text-[12px] font-bold font-mono" style={{ color: "var(--color-ink)" }}>{hex}</p>
        <p className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>{role}{note ? ` — ${note}` : ""}</p>
      </div>
    </div>
  );
}

// ─── Result renderers ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CritiqueResult({ data }: { data: any }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-5 flex-wrap">
        <Score value={data.score} label="Overall Score" />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "var(--color-ink)" }}>{data.summary}</p>
          {data.priority_action && (
            <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: "#fef3c7" }}>
              <span className="text-amber-600 mt-0.5 flex-shrink-0">⚡</span>
              <p className="text-[13px] font-semibold text-amber-900">{data.priority_action}</p>
            </div>
          )}
        </div>
      </div>

      {data.strengths?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--color-muted-soft)" }}>✓ Kekuatan</h4>
          <div className="flex flex-col gap-2">
            {data.strengths.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl px-3 py-2" style={{ background: "#f0fdf4" }}>
                <Icon name="check-circle" size={14} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
                <p className="text-[13px]" style={{ color: "#14532d" }}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.issues?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--color-muted-soft)" }}>Issues</h4>
          <div className="flex flex-col gap-3">
            {data.issues.map((issue: { severity: "high"|"medium"|"low"; area: string; issue: string; fix: string }, i: number) => (
              <div key={i} className="rounded-xl border p-3.5" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <SeverityBadge level={issue.severity} />
                  <span className="text-[12px] font-bold" style={{ color: "var(--color-body)" }}>{issue.area}</span>
                </div>
                <p className="text-[13px] mb-2" style={{ color: "var(--color-ink)" }}>{issue.issue}</p>
                <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: "var(--color-canvas)" }}>
                  <span className="text-[12px] flex-shrink-0" style={{ color: "var(--color-primary-ink)" }}>→</span>
                  <p className="text-[12.5px]" style={{ color: "var(--color-body)" }}>{issue.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PaletteResult({ data }: { data: any }) {
  const { colors, typography } = data;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-4">
        <Score value={colors.harmony_score} label="Warna" />
        <Score value={typography.readability_score} label="Tipografi" />
        <div className="flex-1 min-w-[160px]">
          <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--color-ink)" }}>{data.overall_brand_feel}</p>
          <span className="inline-flex text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}>
            {colors.harmony}
          </span>
        </div>
      </div>

      {colors.dominant?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--color-muted-soft)" }}>Warna Terdeteksi</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {colors.dominant.map((c: { hex: string; role: string; note: string }, i: number) => (
              <ColorChip key={i} hex={c.hex} role={c.role} note={c.note} />
            ))}
          </div>
        </div>
      )}

      {colors.contrast_issues?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Masalah Kontras</h4>
          {colors.contrast_issues.map((issue: string, i: number) => (
            <p key={i} className="text-[13px] py-1" style={{ color: "var(--color-ink)" }}>• {issue}</p>
          ))}
        </div>
      )}

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Tipografi</h4>
        {typography.fonts_detected?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {typography.fonts_detected.map((f: string, i: number) => (
              <span key={i} className="text-[12px] px-2.5 py-1 rounded-lg font-medium" style={{ background: "var(--color-canvas)", color: "var(--color-body)" }}>{f}</span>
            ))}
          </div>
        )}
        {typography.issues?.map((issue: string, i: number) => (
          <p key={i} className="text-[13px] py-1" style={{ color: "var(--color-ink)" }}>• {issue}</p>
        ))}
        {typography.suggestions?.map((s: string, i: number) => (
          <div key={i} className="flex items-start gap-2 mt-2 rounded-lg px-3 py-2" style={{ background: "var(--color-canvas)" }}>
            <span style={{ color: "var(--color-primary-ink)" }}>→</span>
            <p className="text-[12.5px]" style={{ color: "var(--color-body)" }}>{s}</p>
          </div>
        ))}
      </div>

      {data.palette_recommendation && (
        <div className="rounded-xl px-4 py-3" style={{ background: "var(--color-primary-light)" }}>
          <p className="text-[12px] font-bold mb-1" style={{ color: "var(--color-primary-ink)" }}>Rekomendasi</p>
          <p className="text-[13px]" style={{ color: "var(--color-primary-ink)" }}>{data.palette_recommendation}</p>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ConsistencyResult({ data }: { data: any }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-5 flex-wrap">
        <Score value={data.consistency_score} label="Konsistensi" />
        <Score value={data.accessibility_score} label="Accessibility" />
      </div>

      {data.passed_checks?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--color-muted-soft)" }}>✓ Sudah Baik</h4>
          <div className="flex flex-col gap-1.5">
            {data.passed_checks.map((check: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2" style={{ background: "#f0fdf4" }}>
                <Icon name="check" size={13} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
                <p className="text-[13px]" style={{ color: "#14532d" }}>{check}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.consistency_issues?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--color-muted-soft)" }}>Inkonsistensi UI</h4>
          <div className="flex flex-col gap-2.5">
            {data.consistency_issues.map((issue: { type: string; description: string; impact: "high"|"medium"|"low" }, i: number) => (
              <div key={i} className="rounded-xl border p-3" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <SeverityBadge level={issue.impact} />
                  <span className="text-[12px] font-bold" style={{ color: "var(--color-body)" }}>{issue.type}</span>
                </div>
                <p className="text-[13px]" style={{ color: "var(--color-ink)" }}>{issue.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.accessibility_issues?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--color-muted-soft)" }}>Aksesibilitas (WCAG)</h4>
          <div className="flex flex-col gap-2.5">
            {data.accessibility_issues.map((issue: { wcag: string; issue: string; fix: string }, i: number) => (
              <div key={i} className="rounded-xl border p-3" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}>
                <p className="text-[10px] font-bold font-mono mb-1" style={{ color: "#dc2626" }}>{issue.wcag}</p>
                <p className="text-[13px] mb-2" style={{ color: "var(--color-ink)" }}>{issue.issue}</p>
                <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: "var(--color-canvas)" }}>
                  <span style={{ color: "var(--color-primary-ink)" }}>→</span>
                  <p className="text-[12.5px]" style={{ color: "var(--color-body)" }}>{issue.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.quick_wins?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>⚡ Quick Wins</h4>
          {data.quick_wins.map((win: string, i: number) => (
            <div key={i} className="flex items-start gap-2 mb-1.5 rounded-lg px-3 py-2" style={{ background: "#fffbeb" }}>
              <span className="text-amber-600">✦</span>
              <p className="text-[13px] text-amber-900">{win}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LayoutResult({ data }: { data: any }) {
  const wsBg = { "too tight": "#fef2f2", "good": "#f0fdf4", "too loose": "#fffbeb" } as Record<string, string>;
  const wsColor = { "too tight": "#dc2626", "good": "#16a34a", "too loose": "#d97706" } as Record<string, string>;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-5 flex-wrap items-start">
        <Score value={data.visual_hierarchy_score} label="Hierarki" />
        <Score value={data.layout_score} label="Layout" />
        <div className="flex-1 min-w-[140px]">
          <span className="inline-flex text-[12px] font-semibold px-3 py-1 rounded-full mb-2" style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}>
            {data.layout_type}
          </span>
          {data.grid_analysis?.whitespace_usage && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[12px] px-2.5 py-1 rounded-full font-semibold" style={{ background: wsBg[data.grid_analysis.whitespace_usage] ?? "var(--color-canvas)", color: wsColor[data.grid_analysis.whitespace_usage] ?? "var(--color-body)" }}>
                Whitespace: {data.grid_analysis.whitespace_usage}
              </span>
            </div>
          )}
        </div>
      </div>

      {data.above_the_fold && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Above the Fold</h4>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "CTA Terlihat", value: data.above_the_fold.cta_visible },
              { label: "Value Prop Jelas", value: data.above_the_fold.value_prop_clear },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)", color: value ? "#16a34a" : "#dc2626" }}>
                {value ? "✓" : "✗"} {label}
              </div>
            ))}
          </div>
          {data.above_the_fold.notes && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>{data.above_the_fold.notes}</p>
          )}
        </div>
      )}

      {data.grid_analysis?.alignment_issues?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Masalah Alignment</h4>
          {data.grid_analysis.alignment_issues.map((issue: string, i: number) => (
            <p key={i} className="text-[13px] py-1" style={{ color: "var(--color-ink)" }}>• {issue}</p>
          ))}
        </div>
      )}

      {data.flow_issues?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Eye Flow</h4>
          {data.flow_issues.map((issue: string, i: number) => (
            <p key={i} className="text-[13px] py-1" style={{ color: "var(--color-ink)" }}>• {issue}</p>
          ))}
        </div>
      )}

      {data.layout_suggestions?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--color-muted-soft)" }}>Saran Layout</h4>
          <div className="flex flex-col gap-3">
            {data.layout_suggestions.map((s: { area: string; current: string; suggestion: string; impact: "high"|"medium"|"low" }, i: number) => (
              <div key={i} className="rounded-xl border p-3.5" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <SeverityBadge level={s.impact} />
                  <span className="text-[12px] font-bold" style={{ color: "var(--color-body)" }}>{s.area}</span>
                </div>
                <p className="text-[12px] mb-1" style={{ color: "var(--color-muted)" }}>Sekarang: {s.current}</p>
                <div className="flex items-start gap-2 rounded-lg px-3 py-2 mt-1" style={{ background: "var(--color-canvas)" }}>
                  <span style={{ color: "var(--color-primary-ink)" }}>→</span>
                  <p className="text-[13px]" style={{ color: "var(--color-body)" }}>{s.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.reference_patterns?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Pattern Referensi</h4>
          <div className="flex flex-wrap gap-2">
            {data.reference_patterns.map((p: string, i: number) => (
              <span key={i} className="text-[12px] px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--color-canvas)", color: "var(--color-body)" }}>{p}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export default function DesignAssistantPage() {
  const [mode, setMode] = useState<AnalysisMode>("critique");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>("image/png");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [resultMode, setResultMode] = useState<AnalysisMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar (PNG, JPG, WEBP, GIF).");
      return;
    }
    setError(null);
    setResult(null);
    setMediaType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      const b64 = dataUrl.split(",")[1];
      setImageBase64(b64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/design-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, mediaType, mode }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Terjadi kesalahan.");
      } else {
        setResult(data.result as Record<string, unknown>);
        setResultMode(data.mode as AnalysisMode);
      }
    } catch (e) {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const modeConfig = MODES.find((m) => m.id === mode)!;

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="AI Studio"
        title="Design Assistant"
        subtitle="Upload screenshot desain kamu — AI akan menganalisis dan memberikan feedback mendalam"
      />

      <div className="flex flex-col xl:flex-row gap-6 pb-16">
        {/* ── LEFT: Input panel ──────────────────────────────── */}
        <div className="flex flex-col gap-5 xl:w-[400px] flex-shrink-0">

          {/* Mode selector */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Mode Analisis</p>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setResult(null); }}
                    className="text-left rounded-2xl border p-3 transition"
                    style={{
                      borderColor: active ? m.color : "var(--color-hairline)",
                      background: active ? `${m.color}12` : "var(--color-surface-card)",
                      boxShadow: active ? `0 0 0 1px ${m.color}` : "none",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[18px] leading-none" style={{ color: m.color }}>{m.icon}</span>
                      <span className="text-[12.5px] font-bold leading-tight" style={{ color: "var(--color-ink)" }}>{m.label}</span>
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color: "var(--color-muted)" }}>{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload zone */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Screenshot Desain</p>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              className="relative rounded-2xl border-2 border-dashed transition cursor-pointer overflow-hidden"
              style={{
                borderColor: dragging ? modeConfig.color : "var(--color-hairline)",
                background: dragging ? `${modeConfig.color}08` : "var(--color-surface)",
                minHeight: 180,
              }}
            >
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Design preview" className="w-full object-contain" style={{ maxHeight: 300 }} />
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.45)" }}
                  >
                    <p className="text-white text-[13px] font-semibold">Klik untuk ganti gambar</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: `${modeConfig.color}15` }}
                  >
                    <Icon name="upload" size={22} style={{ color: modeConfig.color }} />
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--color-ink)" }}>Drop screenshot di sini</p>
                  <p className="text-[12px] mt-1" style={{ color: "var(--color-muted)" }}>atau klik untuk pilih file</p>
                  <p className="text-[11px] mt-2" style={{ color: "var(--color-muted-soft)" }}>PNG, JPG, WEBP, GIF · Maks 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
            />
          </div>

          {/* Analyze button */}
          <Button
            onClick={handleAnalyze}
            disabled={!imageBase64 || loading}
            size="lg"
            className="w-full"
            style={imageBase64 && !loading ? { background: modeConfig.color } : {}}
          >
            {loading ? (
              <><Icon name="spinner" size={16} spin /> Menganalisis…</>
            ) : (
              <><span className="text-[16px] leading-none">{modeConfig.icon}</span> Analisis {modeConfig.label}</>
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: "#fef2f2" }}>
              <Icon name="alert-triangle" size={14} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
              <p className="text-[13px]" style={{ color: "#991b1b" }}>{error}</p>
            </div>
          )}

          {/* Tips */}
          {!imagePreview && (
            <div className="rounded-2xl p-4" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--color-muted-soft)" }}>Tips untuk hasil terbaik</p>
              {[
                "Screenshot full halaman atau section yang ingin dianalisis",
                "Resolusi yang jelas (min. 800px lebar)",
                "Pastikan semua elemen terlihat (jangan terpotong)",
                "Gunakan berbeda mode untuk insight yang berbeda",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <span className="text-[11px] font-bold mt-0.5" style={{ color: "var(--color-primary-ink)" }}>{i + 1}.</span>
                  <p className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>{tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Result panel ────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center rounded-2xl border py-20"
                style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
              >
                <div
                  className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5"
                  style={{ background: `${modeConfig.color}15` }}
                >
                  <span className="text-[30px] animate-pulse">{modeConfig.icon}</span>
                </div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--color-ink)" }}>AI sedang menganalisis…</p>
                <p className="text-[13px] mt-1.5" style={{ color: "var(--color-muted)" }}>{modeConfig.label}</p>
                <div className="flex gap-1.5 mt-5">
                  {[0, 0.15, 0.3].map((d) => (
                    <motion.div
                      key={d}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: modeConfig.color }}
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 0.8, delay: d, repeat: Infinity }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                {/* Result header */}
                <div
                  className="flex items-center gap-3 rounded-t-2xl px-5 py-3.5 border border-b-0"
                  style={{ borderColor: "var(--color-hairline)", background: `${MODES.find(m => m.id === resultMode)?.color ?? "var(--color-primary)"}12` }}
                >
                  <span className="text-[20px]">{MODES.find(m => m.id === resultMode)?.icon}</span>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: "var(--color-ink)" }}>{MODES.find(m => m.id === resultMode)?.label}</p>
                    <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Analisis selesai · Powered by GPT-4o</p>
                  </div>
                  <button
                    onClick={() => setResult(null)}
                    className="ml-auto p-1.5 rounded-lg hover:bg-[var(--color-canvas)]"
                    style={{ color: "var(--color-muted-soft)" }}
                    aria-label="Tutup hasil"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
                <div
                  className="rounded-b-2xl border p-5"
                  style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
                >
                  {resultMode === "critique" && <CritiqueResult data={result} />}
                  {resultMode === "palette" && <PaletteResult data={result} />}
                  {resultMode === "consistency" && <ConsistencyResult data={result} />}
                  {resultMode === "layout" && <LayoutResult data={result} />}
                </div>

                {/* Re-analyze with another mode */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {MODES.filter(m => m.id !== resultMode).map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setMode(m.id); handleAnalyze(); }}
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-xl border transition hover:bg-[var(--color-canvas)]"
                      style={{ borderColor: "var(--color-hairline)", color: "var(--color-muted)" }}
                    >
                      {m.icon} Analisis {m.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {!result && !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center rounded-2xl border py-20 text-center"
                style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)", borderStyle: "dashed" }}
              >
                <div
                  className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                  style={{ background: "var(--color-primary-light)" }}
                >
                  <Icon name="pen-ruler" size={28} style={{ color: "var(--color-primary-ink)" }} />
                </div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--color-ink)" }}>Hasil analisis muncul di sini</p>
                <p className="text-[13px] mt-1.5 max-w-xs" style={{ color: "var(--color-muted)" }}>
                  Upload screenshot desain, pilih mode, lalu klik Analisis
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ShellLayout>
  );
}
