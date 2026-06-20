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
const MODELS = [{ value: "gpt-image-1", label: "gpt-image-1" }];
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

// ─── Page ─────────────────────────────────────────────────────────────
export default function ImageGeneratorPage() {
  const { images, addImages, removeImage } = useCreativeImageStore();

  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-image-1");
  const [size, setSize] = useState("1024x1024");
  const [style, setStyle] = useState("");
  const [n, setN] = useState(1);
  const [imgA, setImgA] = useState<string | null>(null);
  const [imgB, setImgB] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const needsImages = mode !== "generate";
  const imagesReady = !needsImages || (!!imgA && !!imgB);
  const canRun = !loading && imagesReady && (mode !== "generate" || prompt.trim().length > 0);

  const generate = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    try {
      const fullPrompt = style ? `${prompt}${prompt ? ", " : ""}${style}` : prompt;
      const payload: Record<string, unknown> = { prompt: fullPrompt, size, quality: "medium", n, mode, model };
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
      addImages((data.images as string[]).map((dataUrl) => ({ prompt: prompt || label, size, quality: "medium", dataUrl })));
      setShowHistory(true);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShellLayout>
      <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12">

        {/* ── History pill (top-left) ─────────────────── */}
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="absolute top-0 left-0 inline-flex items-center gap-1.5 h-[32px] px-4 rounded-[20px] text-[14px] font-medium transition-opacity hover:opacity-80"
          style={{ background: PILL_BG, color: TEAL }}
        >
          <Icon name="clock" size={13} /> History
          {images.length > 0 && (
            <span className="text-[11px] font-bold px-1.5 rounded-full" style={{ background: ACCENT, color: "#fff" }}>
              {images.length}
            </span>
          )}
        </button>

        {/* ── Title ───────────────────────────────────── */}
        <div className="flex flex-col items-center gap-5 text-center mb-8 px-4" style={{ color: TEAL }}>
          <h1 className="font-extrabold tracking-tight leading-none text-[40px] sm:text-[56px]">
            Image Generator
          </h1>
          <p className="text-[16px] max-w-[442px] leading-7">
            Hasilkan gambar dari teks, gabungkan dua foto, atau transfer tekstur dari referensi.
          </p>
        </div>

        {/* ── Main card (780px) ───────────────────────── */}
        <div className="mx-auto w-full max-w-[780px] rounded-[24px] p-4" style={{ background: CARD_BG }}>

          {/* Mode tiles */}
          <div className="grid grid-cols-3 gap-[15px]">
            {MODE_CARDS.map((card) => {
              const active = mode === card.value;
              return (
                <button
                  key={card.value}
                  onClick={() => { setMode(card.value); setError(null); }}
                  className="relative h-[141px] rounded-[20px] overflow-hidden text-left transition-all"
                  style={{
                    outline: active ? `2.5px solid ${ACCENT}` : "2.5px solid transparent",
                    outlineOffset: -1,
                  }}
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
          <div className="mt-4 rounded-[20px] p-2" style={{ background: PANEL_BG }}>
            {/* Photo tiles — shown for modes that accept extra images */}
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
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Masukan deskripsi prompt anda"
              className="w-full resize-none bg-transparent outline-none text-[16px] px-3 pt-2 pb-3 placeholder:opacity-60"
              style={{ color: TEAL }}
            />

            {/* Dropdown bar */}
            <div className="flex flex-wrap items-center gap-2 px-1 pb-1">
              <PillSelect value={model} onChange={setModel}>
                {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
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
                onClick={generate}
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
        </div>

        {/* ── Error ───────────────────────────────────── */}
        {error && (
          <div className="mx-auto w-full max-w-[780px] flex items-start gap-2.5 rounded-xl px-4 py-3 mt-4" style={{ background: "#fef2f2" }}>
            <Icon name="alert-triangle" size={13} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
            <p className="text-[13px]" style={{ color: "#991b1b" }}>{error}</p>
          </div>
        )}

        {/* ── History / Gallery ───────────────────────── */}
        {showHistory && images.length > 0 && (
          <div className="mx-auto w-full max-w-[780px] mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold" style={{ color: TEAL }}>Riwayat Gambar</h2>
              <button onClick={() => setShowHistory(false)} className="text-[12px]" style={{ color: TEAL }}>
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
                    style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}
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

      </div>
    </ShellLayout>
  );
}
