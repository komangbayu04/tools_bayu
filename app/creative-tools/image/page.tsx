"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useCreativeImageStore } from "@/lib/creativeStore";

// ─── Constants ───────────────────────────────────────────────────────
const SIZES = [
  { value: "1024x1024", label: "Persegi 1:1" },
  { value: "1024x1536", label: "Potrait 3:4" },
  { value: "1536x1024", label: "Landscape 4:3" },
];
const QUALITIES = [
  { value: "low", label: "Fast" },
  { value: "medium", label: "Balanced" },
  { value: "high", label: "Best" },
];
const COUNTS = [1, 2, 3, 4];

type Mode = "generate" | "combine" | "texture";

interface ModeCard {
  value: Mode;
  label: string;
  sub: string;
  icon: IconName;
  bg: string; // gradient fallback
}

const MODE_CARDS: ModeCard[] = [
  {
    value: "generate",
    label: "Generate Image",
    sub: "Teks ke gambar AI",
    icon: "sparkles",
    bg: "linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4f46e5 100%)",
  },
  {
    value: "combine",
    label: "Combine Image",
    sub: "Gabungkan dua foto",
    icon: "clone",
    bg: "linear-gradient(135deg,#0f2027 0%,#203a43 40%,#2c5364 100%)",
  },
  {
    value: "texture",
    label: "Transfer Texture Image",
    sub: "Terapkan tekstur referensi",
    icon: "palette",
    bg: "linear-gradient(135deg,#1a0533 0%,#4a0572 40%,#7b2ff7 100%)",
  },
];

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

// ─── Image upload slot ────────────────────────────────────────────────
function ImageSlot({
  value, onChange, label, hint,
}: {
  value: string | null; onChange: (v: string | null) => void; label: string; hint: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = async (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    onChange(await readFileAsDataUrl(file));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>{label}</span>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      {value ? (
        <div className="relative rounded-[12px] overflow-hidden border aspect-square" style={{ borderColor: "var(--color-hairline)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button onClick={() => onChange(null)}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center bg-black/55 backdrop-blur-sm hover:bg-black/75 transition-colors">
            <Icon name="x" size={13} className="text-white" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
          className="aspect-square rounded-[12px] flex flex-col items-center justify-center gap-1.5 transition-colors p-3 text-center"
          style={{
            border: `2px dashed ${drag ? "var(--color-primary)" : "var(--color-hairline)"}`,
            background: drag ? "var(--color-primary-light)" : "var(--color-canvas)",
          }}>
          <Icon name="upload-cloud" size={22} style={{ color: "var(--color-primary)" }} />
          <span className="text-[11.5px] leading-snug" style={{ color: "var(--color-muted)" }}>{hint}</span>
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function ImageGeneratorPage() {
  const { images, addImages, removeImage } = useCreativeImageStore();

  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("medium");
  const [n, setN] = useState(1);
  const [imgA, setImgA] = useState<string | null>(null);
  const [imgB, setImgB] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const needsImages = mode !== "generate";
  const imagesReady = !needsImages || (!!imgA && !!imgB);
  const canRun = !loading && imagesReady && (mode !== "generate" || prompt.trim().length > 0);

  const promptPlaceholder =
    mode === "combine"
      ? 'Opsional: arahkan hasilnya. Contoh: "letakkan produk di atas meja kayu"'
      : mode === "texture"
        ? 'Opsional: detail tambahan. Contoh: "buat permukaannya mengkilap"'
        : "Masukan deskripsi prompt anda";

  const generate = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { prompt, size, quality, n, mode };
      if (needsImages) payload.images = [imgA, imgB];

      const res = await fetch("/api/creative/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Terjadi kesalahan.");
        return;
      }
      const label = mode === "combine" ? "Kombinasi foto" : mode === "texture" ? "Transfer tekstur" : prompt;
      addImages((data.images as string[]).map((dataUrl) => ({ prompt: prompt || label, size, quality, dataUrl })));
      setShowHistory(true);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShellLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">

        {/* ── Top bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-1 pt-2 pb-4">
          <Link href="/creative-tools">
            <button className="flex items-center gap-2 text-[13px] font-semibold px-3 py-2 rounded-[10px] transition-colors hover:bg-[var(--color-surface-card)]"
              style={{ color: "var(--color-muted)" }}>
              <Icon name="arrow-left" size={14} /> Creative Tools
            </button>
          </Link>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-[13px] font-semibold px-3 py-2 rounded-[10px] border transition-colors hover:bg-[var(--color-surface-card)]"
            style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}>
            <Icon name="clock" size={14} /> History
            {images.length > 0 && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--color-primary)", color: "#fff" }}>
                {images.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Title ───────────────────────────────────── */}
        <div className="text-center mb-8 px-4">
          <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-tight mb-2" style={{ color: "var(--color-ink)" }}>
            Image Generator
          </h1>
          <p className="text-[14px]" style={{ color: "var(--color-muted)" }}>
            Hasilkan gambar dari teks, gabungkan dua foto, atau transfer tekstur dari referensi.
          </p>
        </div>

        {/* ── Mode tiles ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 px-1">
          {MODE_CARDS.map((card) => {
            const active = mode === card.value;
            return (
              <button
                key={card.value}
                onClick={() => { setMode(card.value); setError(null); }}
                className="relative rounded-[18px] overflow-hidden text-left transition-all"
                style={{
                  height: 160,
                  outline: active ? "2.5px solid var(--color-primary)" : "2.5px solid transparent",
                  outlineOffset: active ? 2 : 0,
                  boxShadow: active ? "0 0 0 4px var(--color-primary-light)" : "none",
                }}
              >
                {/* bg gradient */}
                <div className="absolute inset-0" style={{ background: card.bg }} />
                {/* noise overlay */}
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
                {/* content */}
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name={card.icon} size={16} className="text-white/80" />
                    {active && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/20 text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] font-bold text-white leading-snug">{card.label}</p>
                  <p className="text-[12px] text-white/70 mt-0.5">{card.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Image upload slots (combine / texture) ── */}
        <AnimatePresence>
          {needsImages && (
            <motion.div
              key="slots"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <ImageSlot
                  value={imgA} onChange={setImgA}
                  label={mode === "texture" ? "Subjek (Foto 1)" : "Foto 1"}
                  hint={mode === "texture" ? "Objek yang akan diberi tekstur" : "Objek / subjek utama"}
                />
                <ImageSlot
                  value={imgB} onChange={setImgB}
                  label={mode === "texture" ? "Referensi Tekstur (Foto 2)" : "Foto 2"}
                  hint={mode === "texture" ? "Material / tekstur referensi" : "Elemen / latar yang digabung"}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Prompt + bottom bar ─────────────────────── */}
        <div className="rounded-[20px] border overflow-hidden mb-6"
          style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>

          {/* Textarea */}
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={promptPlaceholder}
            className="w-full resize-none px-5 py-4 text-[14px] bg-transparent outline-none border-b"
            style={{
              borderColor: "var(--color-hairline)",
              color: "var(--color-ink)",
            }}
          />

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            {/* Pilih Model — gpt-image-1 only for now */}
            <div className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] border cursor-default"
              style={{ borderColor: "var(--color-hairline)", color: "var(--color-muted)" }}>
              <Icon name="sparkles" size={12} /> gpt-image-1
            </div>

            {/* Ratio */}
            <div className="relative">
              <Select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="text-[12px] pl-3 pr-7 py-1.5 rounded-[8px]"
              >
                {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>

            {/* Kualitas / Style */}
            <div className="relative">
              <Select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="text-[12px] pl-3 pr-7 py-1.5 rounded-[8px]"
              >
                {QUALITIES.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
              </Select>
            </div>

            {/* Jumlah foto */}
            <div className="relative">
              <Select
                value={String(n)}
                onChange={(e) => setN(Number(e.target.value))}
                className="text-[12px] pl-3 pr-7 py-1.5 rounded-[8px]"
              >
                {COUNTS.map((v) => <option key={v} value={v}>{v} foto</option>)}
              </Select>
            </div>

            <div className="flex-1" />

            {/* Generate button */}
            <Button onClick={generate} disabled={!canRun}>
              {loading
                ? <><Icon name="spinner" size={14} spin /> Generating…</>
                : <><Icon name="sparkles" size={14} /> {mode === "combine" ? "Combine" : mode === "texture" ? "Transfer" : "Generate"}</>}
            </Button>
          </div>
        </div>

        {/* ── Error ───────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-6" style={{ background: "#fef2f2" }}>
            <Icon name="alert-triangle" size={13} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
            <p className="text-[13px]" style={{ color: "#991b1b" }}>{error}</p>
          </div>
        )}

        {/* ── History / Gallery ────────────────────────── */}
        {showHistory && images.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold" style={{ color: "var(--color-ink)" }}>Riwayat Gambar</h2>
              <button onClick={() => setShowHistory(false)} className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                Tutup
              </button>
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
                    style={{ borderColor: "var(--color-hairline)", background: "var(--color-canvas)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.dataUrl} alt={img.prompt} className="w-full aspect-square object-cover" />
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

        {/* Empty state when history hidden */}
        {!showHistory && images.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <Icon name="image" size={36} style={{ color: "var(--color-muted-soft)" }} />
            <p className="mt-3 text-[14px]" style={{ color: "var(--color-muted)" }}>
              Pilih mode, tulis prompt, lalu klik Generate.
            </p>
          </div>
        )}

      </div>
    </ShellLayout>
  );
}
