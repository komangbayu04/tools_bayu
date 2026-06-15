"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Icon } from "@/components/ui/icon";
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

function download(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

export default function ImageGeneratorPage() {
  const { images, addImages, removeImage } = useCreativeImageStore();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("medium");
  const [n, setN] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/creative/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size, quality, n }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Terjadi kesalahan.");
        return;
      }
      addImages((data.images as string[]).map((dataUrl) => ({ prompt, size, quality, dataUrl })));
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
        subtitle="Hasilkan gambar dari teks dengan AI."
        actions={
          <Link href="/creative-tools">
            <Button variant="outline">
              <Icon name="arrow-left" size={14} /> Creative Tools
            </Button>
          </Link>
        }
      />

      {/* Generator card */}
      <div
        className="rounded-[20px] border mb-8 p-5"
        style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
      >
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>
          Deskripsikan gambar
        </label>
        <Textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Contoh: "Ilustrasi flat-design seorang freelancer bekerja di kafe, palet hangat, gaya minimalis."'
        />

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
          <Button onClick={generate} disabled={!prompt.trim() || loading}>
            {loading ? <><Icon name="spinner" size={14} spin /> Generating…</> : <><Icon name="sparkles" size={14} /> Generate</>}
          </Button>
          <p className="text-[11.5px]" style={{ color: "var(--color-muted-soft)" }}>
            Riwayat disimpan lokal di browser ini (maks. 12 terbaru).
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
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-muted)" }}>Belum ada gambar. Mulai dengan menulis prompt di atas.</p>
        </div>
      )}
    </ShellLayout>
  );
}
