"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useCreativeImageStore } from "@/lib/creativeStore";

const SIZES = [
  { value: "1024x1024", label: "Persegi · 1024×1024" },
  { value: "1024x1536", label: "Potrait · 1024×1536" },
  { value: "1536x1024", label: "Landscape · 1536×1024" },
];
const QUALITIES = [
  { value: "low", label: "Cepat (low)" },
  { value: "medium", label: "Seimbang (medium)" },
  { value: "high", label: "Terbaik (high)" },
];

type Mode = "generate" | "combine" | "texture";
const MODES: { value: Mode; label: string; icon: IconName }[] = [
  { value: "generate", label: "Teks → Gambar", icon: "sparkles" },
  { value: "combine", label: "Kombinasi Foto", icon: "clone" },
  { value: "texture", label: "Transfer Tekstur", icon: "palette" },
];

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

// ─── Image upload slot ────────────────────────────────────────────
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

  const needsImages = mode !== "generate";
  const imagesReady = !needsImages || (!!imgA && !!imgB);
  // Combine/texture modes can run from images alone; generate needs a prompt.
  const canRun = !loading && imagesReady && (mode !== "generate" || prompt.trim().length > 0);

  const promptPlaceholder =
    mode === "combine"
      ? 'Opsional: arahkan hasilnya. Contoh: "letakkan produk di atas meja kayu, cahaya pagi".'
      : mode === "texture"
        ? 'Opsional: detail tambahan. Contoh: "buat permukaannya mengkilap seperti keramik".'
        : 'Contoh: "Ilustrasi flat-design seorang freelancer bekerja di kafe, palet hangat, gaya minimalis."';

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
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="Creative Tools"
        title="Image Generator"
        subtitle="Hasilkan gambar dari teks, gabungkan dua foto, atau transfer tekstur dari referensi."
        actions={
          <Link href="/creative-tools">
            <Button variant="outline">
              <Icon name="arrow-left" size={14} /> Creative Tools
            </Button>
          </Link>
        }
      />

      {/* Generator card */}
      <div className="rounded-[20px] border mb-8 p-5" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
        {/* Mode switch */}
        <div className="flex flex-wrap gap-2 mb-5">
          {MODES.map((m) => {
            const on = mode === m.value;
            return (
              <button key={m.value} onClick={() => { setMode(m.value); setError(null); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold border transition-all"
                style={{
                  borderColor: on ? "var(--color-primary)" : "var(--color-hairline)",
                  background: on ? "var(--color-primary-light)" : "var(--color-surface)",
                  color: on ? "var(--color-primary-ink)" : "var(--color-muted)",
                }}>
                <Icon name={m.icon} size={14} /> {m.label}
              </button>
            );
          })}
        </div>

        {/* Image slots for combine / texture */}
        {needsImages && (
          <div className="grid grid-cols-2 gap-4 mb-5 max-w-md">
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
        )}

        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>
          {mode === "generate" ? "Deskripsikan gambar" : "Arahan (opsional)"}
        </label>
        <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={promptPlaceholder} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted-soft)" }}>Ukuran</label>
            <Select value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted-soft)" }}>Kualitas</label>
            <Select value={quality} onChange={(e) => setQuality(e.target.value)}>
              {QUALITIES.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted-soft)" }}>Jumlah</label>
            <Select value={String(n)} onChange={(e) => setN(Number(e.target.value))}>
              {[1, 2, 3, 4].map((v) => <option key={v} value={v}>{v} gambar</option>)}
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button onClick={generate} disabled={!canRun}>
            {loading
              ? <><Icon name="spinner" size={14} spin /> {mode === "generate" ? "Generating…" : "Memproses…"}</>
              : <><Icon name="sparkles" size={14} /> {mode === "combine" ? "Gabungkan" : mode === "texture" ? "Transfer Tekstur" : "Generate"}</>}
          </Button>
          <p className="text-[11.5px]" style={{ color: "var(--color-muted-soft)" }}>
            {needsImages
              ? "Unggah kedua foto, lalu jalankan. Riwayat disimpan lokal (maks. 12)."
              : "Riwayat disimpan lokal di browser ini (maks. 12 terbaru)."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 mt-4" style={{ background: "#fef2f2" }}>
            <Icon name="alert-triangle" size={13} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
            <p className="text-[13px]" style={{ color: "#991b1b" }}>{error}</p>
          </div>
        )}
      </div>

      {/* Gallery */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
      ) : (
        <div className="text-center py-16">
          <Icon name="image" size={32} style={{ color: "var(--color-muted-soft)" }} />
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-muted)" }}>Belum ada gambar. Mulai dengan menulis prompt atau unggah foto di atas.</p>
        </div>
      )}
    </ShellLayout>
  );
}
