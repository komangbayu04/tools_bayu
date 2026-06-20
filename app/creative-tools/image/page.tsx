"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { Icon, type IconName } from "@/components/ui/icon";
import { useCreativeImageStore } from "@/lib/creativeStore";

// ─── Palette (from Figma) ────────────────────────────────────────────
const TEAL = "#1c4f4f";
const ACCENT = "#018786";
const CARD_BG = "#f9fafa";
const PANEL_BG = "#eff0f0";
const PILL_BG = "#e0f0f0";

// ─── Constants ───────────────────────────────────────────────────────
// `edit: true` → the model supports image-to-image (combine / transfer texture).
const ALL_MODELS = [
  { value: "gpt-5.5", label: "GPT-5.5 ✨ (terbaru)", edit: true, single: true },
  { value: "gpt-image-1", label: "GPT Image 1", edit: true, single: false },
  { value: "gpt-image-1-mini", label: "GPT Image 1 Mini", edit: true, single: false },
  { value: "dall-e-3", label: "DALL·E 3", edit: false, single: true },
  { value: "dall-e-2", label: "DALL·E 2", edit: false, single: false },
];

// Models that only ever return a single image.
const SINGLE_IMAGE = new Set(ALL_MODELS.filter((m) => m.single).map((m) => m.value));
const SIZES = [
  { value: "1024x1024", label: "Persegi 1:1" },
  { value: "1024x1536", label: "Potrait 3:4" },
  { value: "1536x1024", label: "Landscape 4:3" },
];
const STYLES = [
  { value: "", label: "Default" },
  { value: "fotografi realistis, sangat detail", label: "Realistis" },
  { value: "ilustrasi flat-design minimalis", label: "Minimalis" },
  { value: "gaya anime, warna cerah", label: "Anime" },
  { value: "render 3D, pencahayaan studio", label: "3D Render" },
  { value: "sinematik, dramatic lighting", label: "Sinematik" },
];
const COUNTS = [1, 2, 3, 4];

type Mode = "generate" | "combine" | "texture";

interface ModeCard {
  value: Mode;
  label: string;
  icon: IconName;
  bg: string;
}

const MODE_CARDS: ModeCard[] = [
  { value: "generate", label: "Generate Image", icon: "sparkles", bg: "linear-gradient(135deg,#3a1c1c 0%,#7a2e1e 45%,#d94a2b 100%)" },
  { value: "combine", label: "Combine Image", icon: "clone", bg: "linear-gradient(135deg,#1a0808 0%,#3d0f0f 45%,#7a1a1a 100%)" },
  { value: "texture", label: "Transfer texture Image", icon: "palette", bg: "linear-gradient(135deg,#3b4a1f 0%,#5c7a2e 50%,#8fae4a 100%)" },
];

const MODE_LABEL: Record<Mode, string> = {
  generate: "Generate Image",
  combine: "Combine Image",
  texture: "Transfer Texture",
};

// A single generation in the running session.
interface ResultEntry {
  id: string;
  prompt: string;
  mode: Mode;
  count: number;
  images: string[];
  loading: boolean;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function download(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

// ─── Zoomable lightbox ───────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  const clampScale = (s: number) => Math.min(Math.max(s, 1), 5);

  const zoom = (delta: number) => {
    setScale((s) => {
      const next = clampScale(s + delta);
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.82)" }}
    >
      {/* Toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => zoom(-0.5)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 text-white">
          <Icon name="minus" size={16} />
        </button>
        <span className="text-white text-[13px] font-semibold w-12 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => zoom(0.5)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 text-white">
          <Icon name="plus" size={16} />
        </button>
        <button onClick={() => download(src, "image.png")} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 text-white">
          <Icon name="download" size={16} />
        </button>
        <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 text-white">
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Image */}
      <div
        className="overflow-hidden flex items-center justify-center w-full h-full p-8"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => zoom(e.deltaY < 0 ? 0.25 : -0.25)}
        onDoubleClick={() => (scale > 1 ? (setScale(1), setPos({ x: 0, y: 0 })) : setScale(2))}
        onPointerDown={(e) => {
          if (scale === 1) return;
          drag.current = { ox: pos.x, oy: pos.y, px: e.clientX, py: e.clientY };
          setDragging(true);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPos({ x: drag.current.ox + (e.clientX - drag.current.px), y: drag.current.oy + (e.clientY - drag.current.py) });
        }}
        onPointerUp={() => { drag.current = null; setDragging(false); }}
        style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="preview"
          draggable={false}
          className="max-w-full max-h-full object-contain select-none rounded-lg"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transition: dragging ? "none" : "transform 0.12s ease-out" }}
        />
      </div>
    </motion.div>
  );
}

// ─── Pill dropdown ───────────────────────────────────────────────────
function PillSelect({
  value, onChange, children,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex items-center h-[32px] rounded-[20px] bg-white pl-4 pr-7"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent outline-none text-[14px] font-medium cursor-pointer"
        style={{ color: TEAL }}
      >
        {children}
      </select>
      <Icon name="chevron-down" size={12} className="absolute right-3 pointer-events-none" style={{ color: TEAL }} />
    </div>
  );
}

// ─── Compact image upload tile ("+") ─────────────────────────────────
function ImageTile({
  value, onChange, title,
}: {
  value: string | null; onChange: (v: string | null) => void; title: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = async (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    onChange(await readFileAsDataUrl(file));
  };

  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      {value ? (
        <div className="relative w-[64px] h-[64px] rounded-[12px] overflow-hidden border" style={{ borderColor: "rgba(0,0,0,0.10)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={title} className="w-full h-full object-cover" />
          <button onClick={() => onChange(null)}
            className="absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center bg-black/55 backdrop-blur-sm hover:bg-black/75 transition-colors">
            <Icon name="x" size={11} className="text-white" />
          </button>
        </div>
      ) : (
        <button type="button" title={title} onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
          className="w-[64px] h-[64px] rounded-[12px] flex items-center justify-center transition-colors"
          style={{
            border: `1.5px solid ${drag ? ACCENT : "rgba(0,0,0,0.14)"}`,
            background: drag ? PILL_BG : "rgba(255,255,255,0.6)",
          }}>
          <Icon name="plus" size={20} style={{ color: drag ? ACCENT : TEAL }} />
        </button>
      )}
    </>
  );
}

// ─── Shared prompt panel (#eff0f0) ───────────────────────────────────
function PromptPanel(props: {
  mode: Mode;
  needsImages: boolean;
  models: { value: string; label: string }[];
  imgA: string | null; setImgA: (v: string | null) => void;
  imgB: string | null; setImgB: (v: string | null) => void;
  prompt: string; setPrompt: (v: string) => void;
  model: string; setModel: (v: string) => void;
  size: string; setSize: (v: string) => void;
  style: string; setStyle: (v: string) => void;
  n: number; setN: (v: number) => void;
  canRun: boolean; loading: boolean; onGenerate: () => void;
}) {
  const { mode, needsImages, models, imgA, setImgA, imgB, setImgB, prompt, setPrompt,
    model, setModel, size, setSize, style, setStyle, n, setN, canRun, loading, onGenerate } = props;

  return (
    <div className="rounded-[20px] p-2" style={{ background: PANEL_BG }}>
      {/* Photo tiles for modes that accept extra images */}
      <AnimatePresence>
        {needsImages && (
          <motion.div
            key="tiles"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-3 pt-3">
              <ImageTile value={imgA} onChange={setImgA}
                title={mode === "texture" ? "Subjek utama" : "Foto 1 — objek utama"} />
              <ImageTile value={imgB} onChange={setImgB}
                title={mode === "texture" ? "Referensi tekstur" : "Foto 2 — elemen/latar"} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Masukan deskripsi prompt anda"
        className="w-full resize-none bg-transparent outline-none text-[16px] px-3 pt-2 pb-3 placeholder:opacity-60"
        style={{ color: TEAL }}
      />

      <div className="flex flex-wrap items-center gap-2 px-1 pb-1">
        <PillSelect value={model} onChange={setModel}>
          {models.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </PillSelect>
        <PillSelect value={size} onChange={setSize}>
          {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </PillSelect>
        <PillSelect value={style} onChange={setStyle}>
          {STYLES.map((s) => <option key={s.label} value={s.value}>{s.label}</option>)}
        </PillSelect>
        <PillSelect value={String(n)} onChange={(v) => setN(Number(v))}>
          {COUNTS.map((v) => <option key={v} value={v}>{v} foto</option>)}
        </PillSelect>

        <div className="flex-1" />

        <button
          onClick={onGenerate}
          disabled={!canRun}
          className="inline-flex items-center justify-center gap-1.5 h-[32px] px-5 rounded-[20px] text-[14px] font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: ACCENT }}
        >
          {loading
            ? <><Icon name="spinner" size={13} spin /> Generating…</>
            : <>{mode === "combine" ? "Combine" : mode === "texture" ? "Transfer" : "Generate"}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function ImageGeneratorPage() {
  const { images, addImages, removeImage } = useCreativeImageStore();

  const [view, setView] = useState<"landing" | "result">("landing");
  const [results, setResults] = useState<ResultEntry[]>([]);

  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-5.5");
  const [size, setSize] = useState("1024x1024");
  const [style, setStyle] = useState("");
  const [n, setN] = useState(1);
  const [imgA, setImgA] = useState<string | null>(null);
  const [imgB, setImgB] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const needsImages = mode !== "generate";
  const imagesReady = !needsImages || (!!imgA && !!imgB);
  const canRun = !loading && imagesReady && (mode !== "generate" || prompt.trim().length > 0);

  // Image-to-image modes only work with edit-capable models.
  const availableModels = (needsImages ? ALL_MODELS.filter((m) => m.edit) : ALL_MODELS)
    .map((m) => ({ value: m.value, label: m.label }));

  // Switching modes: pick a compatible model and a sensible photo count.
  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    const editOnly = next !== "generate";
    if (editOnly && !ALL_MODELS.find((m) => m.value === model)?.edit) setModel("gpt-5.5");
  };

  const generate = async () => {
    if (!canRun) return;

    const entryId = crypto.randomUUID();
    const entryPrompt = prompt.trim();
    const entryMode = mode;
    const entryCount = n;

    // Show a pending result immediately, then move to the result view.
    setResults((r) => [
      { id: entryId, prompt: entryPrompt, mode: entryMode, count: entryCount, images: [], loading: true },
      ...r,
    ]);
    setView("result");
    setLoading(true);
    setError(null);

    try {
      const fullPrompt = style ? `${entryPrompt}${entryPrompt ? ", " : ""}${style}` : entryPrompt;
      const payload: Record<string, unknown> = { prompt: fullPrompt, size, quality: "medium", n, mode: entryMode, model };
      if (needsImages) payload.images = [imgA, imgB];

      const res = await fetch("/api/creative/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const msg = data.error ?? "Terjadi kesalahan.";
        setResults((r) => r.map((e) => (e.id === entryId ? { ...e, loading: false, error: msg } : e)));
        return;
      }

      const imgs = data.images as string[];
      setResults((r) => r.map((e) => (e.id === entryId ? { ...e, loading: false, images: imgs } : e)));
      // Only the generated images go into history.
      addImages(imgs.map((dataUrl) => ({ prompt: entryPrompt, size, quality: "medium", dataUrl })));
    } catch {
      setResults((r) => r.map((e) => (e.id === entryId ? { ...e, loading: false, error: "Koneksi gagal. Coba lagi." } : e)));
    } finally {
      setLoading(false);
    }
  };

  const HistoryPill = (
    <button
      onClick={() => setShowHistory((v) => !v)}
      className="inline-flex items-center gap-1.5 h-[32px] px-4 rounded-[20px] text-[14px] font-medium transition-opacity hover:opacity-80"
      style={{ background: PILL_BG, color: TEAL }}
    >
      <Icon name="clock" size={13} /> History
      {images.length > 0 && (
        <span className="text-[11px] font-bold px-1.5 rounded-full" style={{ background: ACCENT, color: "#fff" }}>
          {images.length}
        </span>
      )}
    </button>
  );

  const handleSetModel = (v: string) => {
    setModel(v);
    if (SINGLE_IMAGE.has(v)) setN(1); // some models return one image at a time.
  };

  const promptPanel = (
    <PromptPanel
      mode={mode} needsImages={needsImages} models={availableModels}
      imgA={imgA} setImgA={setImgA} imgB={imgB} setImgB={setImgB}
      prompt={prompt} setPrompt={setPrompt}
      model={model} setModel={handleSetModel}
      size={size} setSize={setSize}
      style={style} setStyle={setStyle}
      n={n} setN={setN}
      canRun={canRun} loading={loading} onGenerate={generate}
    />
  );

  const lightbox = (
    <AnimatePresence>
      {zoomSrc && <Lightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />}
    </AnimatePresence>
  );

  // ── RESULT VIEW ──────────────────────────────────────────────────
  if (view === "result") {
    return (
      <ShellLayout>
        <div className="flex flex-col min-h-[calc(100vh-7rem)]">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setView("landing")}
              className="inline-flex items-center gap-1.5 text-[16px] font-medium transition-opacity hover:opacity-70"
              style={{ color: TEAL }}
            >
              <Icon name="chevron-down" size={14} className="rotate-90" /> Back
            </button>
            <div className="inline-flex items-center gap-2 h-[32px] px-4 rounded-[20px] text-[14px] font-medium"
              style={{ background: PILL_BG, color: TEAL }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT }} />
              {MODE_LABEL[mode]}
            </div>
          </div>

          {/* Results list */}
          <div className="flex-1 space-y-5 pb-6">
            {results.map((r) => (
              <div key={r.id} className="rounded-[20px] p-6" style={{ background: CARD_BG }}>
                <div className="flex flex-wrap gap-4">
                  {r.loading
                    ? Array.from({ length: r.count }).map((_, i) => (
                        <div key={i} className="w-[240px] h-[240px] rounded-[12px] animate-pulse"
                          style={{ background: "#d9dcdc" }} />
                      ))
                    : r.images.map((src, i) => (
                        <div key={i} className="group relative w-[240px] h-[240px] rounded-[12px] overflow-hidden border"
                          style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                          <button onClick={() => setZoomSrc(src)} className="block w-full h-full cursor-zoom-in" title="Klik untuk perbesar">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={r.prompt} className="w-full h-full object-cover" />
                          </button>
                          <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setZoomSrc(src)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/55 backdrop-blur-sm"
                              title="Perbesar"
                            >
                              <Icon name="expand" size={13} className="text-white" />
                            </button>
                            <button
                              onClick={() => download(src, `image-${r.id}-${i}.png`)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/55 backdrop-blur-sm"
                              title="Unduh"
                            >
                              <Icon name="download" size={13} className="text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                </div>

                {r.error ? (
                  <p className="mt-4 text-[14px]" style={{ color: "#dc2626" }}>{r.error}</p>
                ) : (
                  r.prompt && <p className="mt-4 text-[16px]" style={{ color: TEAL }}>{r.prompt}</p>
                )}
              </div>
            ))}
          </div>

          {/* Sticky prompt bar */}
          <div className="sticky bottom-0 pt-3 pb-2" style={{ background: "var(--color-surface, #fff)" }}>
            {promptPanel}
          </div>
        </div>
        {lightbox}
      </ShellLayout>
    );
  }

  // ── LANDING VIEW ─────────────────────────────────────────────────
  return (
    <ShellLayout>
      <div className="relative min-h-[calc(100vh-7rem)] flex flex-col items-center justify-center">

        <div className="absolute top-0 left-0">{HistoryPill}</div>

        {/* Title */}
        <div className="flex flex-col items-center gap-5 text-center mb-8 px-4" style={{ color: TEAL }}>
          <h1 className="font-extrabold tracking-tight leading-none text-[40px] sm:text-[56px]">
            Image Generator
          </h1>
          <p className="text-[16px] max-w-[442px] leading-7">
            Hasilkan gambar dari teks, gabungkan dua foto, atau transfer tekstur dari referensi.
          </p>
        </div>

        {/* Main card (780px) */}
        <div className="mx-auto w-full max-w-[780px] rounded-[24px] p-4" style={{ background: CARD_BG }}>
          {/* Mode tiles */}
          <div className="grid grid-cols-3 gap-[15px]">
            {MODE_CARDS.map((card) => {
              const active = mode === card.value;
              return (
                <button
                  key={card.value}
                  onClick={() => switchMode(card.value)}
                  className="relative h-[141px] rounded-[20px] overflow-hidden text-left transition-all"
                  style={{ outline: active ? `2.5px solid ${ACCENT}` : "2.5px solid transparent", outlineOffset: -1 }}
                >
                  <div className="absolute inset-0" style={{ background: card.bg }} />
                  <div className="absolute inset-0 opacity-25"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                  {active && (
                    <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/25 text-white">
                      Active
                    </span>
                  )}
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 px-2">
                    <Icon name={card.icon} size={14} className="text-white/85" />
                    <span className="text-[15px] font-medium text-white text-center leading-tight">{card.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Prompt panel */}
          <div className="mt-4">{promptPanel}</div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-auto w-full max-w-[780px] flex items-start gap-2.5 rounded-xl px-4 py-3 mt-4" style={{ background: "#fef2f2" }}>
            <Icon name="alert-triangle" size={13} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
            <p className="text-[13px]" style={{ color: "#991b1b" }}>{error}</p>
          </div>
        )}

        {/* History / Gallery */}
        {showHistory && images.length > 0 && (
          <div className="mx-auto w-full max-w-[780px] mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold" style={{ color: TEAL }}>Riwayat Gambar</h2>
              <button onClick={() => setShowHistory(false)} className="text-[12px]" style={{ color: TEAL }}>Tutup</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
              <AnimatePresence>
                {images.map((img) => (
                  <motion.div
                    key={img.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="group relative rounded-[14px] overflow-hidden border"
                    style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
                  >
                    <button onClick={() => setZoomSrc(img.dataUrl)} className="block w-full cursor-zoom-in" title="Klik untuk perbesar">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.dataUrl} alt={img.prompt} className="w-full aspect-square object-cover" />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 p-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)" }}>
                      <button
                        onClick={() => download(img.dataUrl, `image-${img.id}.png`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold text-white"
                        style={{ background: "rgba(255,255,255,0.18)" }}
                      >
                        <Icon name="download" size={12} /> Unduh
                      </button>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white"
                        style={{ background: "rgba(255,255,255,0.18)" }}
                        aria-label="Hapus"
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

      </div>
      {lightbox}
    </ShellLayout>
  );
}
