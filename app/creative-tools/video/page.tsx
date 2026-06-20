"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useCreativeVideoStore, type GeneratedVideo } from "@/lib/creativeStore";
import { uploadDataUrl } from "@/lib/supabase";

const MODELS = [
  { value: "sora-2", label: "Sora 2 (cepat)" },
  { value: "sora-2-pro", label: "Sora 2 Pro (kualitas tinggi)" },
];
const SECONDS = [
  { value: "4", label: "4 detik" },
  { value: "8", label: "8 detik" },
  { value: "12", label: "12 detik" },
];
const SIZES = [
  { value: "1280x720", label: "Landscape · 1280×720" },
  { value: "720x1280", label: "Potrait · 720×1280" },
  { value: "1792x1024", label: "Wide · 1792×1024" },
  { value: "1024x1792", label: "Tall · 1024×1792" },
];

const STATUS_LABEL: Record<string, string> = {
  queued: "Dalam antrean…",
  in_progress: "Merender video…",
  completed: "Selesai",
  failed: "Gagal",
};

function download(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

export default function VideoGeneratorPage() {
  const { videos, addVideo, updateVideo, removeVideo } = useCreativeVideoStore();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("sora-2");
  const [seconds, setSeconds] = useState("4");
  const [size, setSize] = useState("1280x720");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  // Guards against state updates after the page unmounts: an 8s poll can resolve
  // after the user has navigated away, which would warn + waste work.
  const mounted = useRef(true);

  const startPolling = (localId: string, videoId: string) => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/creative/video?id=${encodeURIComponent(videoId)}`);
        const data = await res.json();
        if (!mounted.current) return;
        if (data.error) {
          updateVideo(localId, { status: "failed", error: data.error });
          stopPolling(localId);
          return;
        }
        if (data.status === "completed" && data.dataUrl) {
          // Upload the finished video to Supabase Storage and keep only the URL
          // in state; fall back to the inline data URL if the upload fails.
          const url = (await uploadDataUrl(data.dataUrl, "video")) ?? data.dataUrl;
          if (!mounted.current) return;
          updateVideo(localId, { status: "completed", dataUrl: url });
          stopPolling(localId);
        } else if (data.status === "failed") {
          updateVideo(localId, { status: "failed", error: data.error ?? "Render gagal." });
          stopPolling(localId);
        } else {
          updateVideo(localId, { status: data.status });
        }
      } catch {
        /* transient — keep polling */
      }
    };
    tick();
    pollers.current[localId] = setInterval(tick, 8000);
  };

  const stopPolling = (localId: string) => {
    if (pollers.current[localId]) {
      clearInterval(pollers.current[localId]);
      delete pollers.current[localId];
    }
  };

  // Resume polling for any pending jobs (e.g. after a page refresh).
  useEffect(() => {
    const active = pollers.current;
    videos.forEach((v) => {
      if ((v.status === "queued" || v.status === "in_progress") && !active[v.id]) {
        startPolling(v.id, v.videoId);
      }
    });
    return () => {
      mounted.current = false;
      Object.values(active).forEach(clearInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/creative/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, seconds, size }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Terjadi kesalahan.");
        return;
      }
      const localId = addVideo({
        videoId: data.videoId,
        prompt,
        model,
        seconds,
        size,
        status: data.status ?? "queued",
      });
      startPolling(localId, data.videoId);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const remove = (v: GeneratedVideo) => {
    stopPolling(v.id);
    removeVideo(v.id);
  };

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="Creative Tools"
        title="Video Generator"
        subtitle="Buat klip video pendek dari teks dengan model Sora."
        actions={
          <Link href="/creative-tools">
            <Button variant="outline">
              <Icon name="arrow-left" size={14} /> Creative Tools
            </Button>
          </Link>
        }
      />

      <div
        className="rounded-[20px] border mb-8 p-5"
        style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
      >
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>
          Deskripsikan video
        </label>
        <Textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Contoh: "Drone shot perlahan melintasi sawah terasering Bali saat matahari terbit, kabut tipis, sinematik."'
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted-soft)" }}>Model</label>
            <Select value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted-soft)" }}>Durasi</label>
            <Select value={seconds} onChange={(e) => setSeconds(e.target.value)}>
              {SECONDS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted-soft)" }}>Resolusi</label>
            <Select value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button onClick={generate} disabled={!prompt.trim() || loading}>
            {loading ? <><Icon name="spinner" size={14} spin /> Mengirim…</> : <><Icon name="film" size={14} /> Generate Video</>}
          </Button>
          <p className="text-[11.5px]" style={{ color: "var(--color-muted-soft)" }}>
            Render bisa memakan beberapa menit. Status diperbarui otomatis.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 mt-4" style={{ background: "#fef2f2" }}>
            <Icon name="alert-triangle" size={13} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
            <p className="text-[13px]" style={{ color: "#991b1b" }}>{error}</p>
          </div>
        )}
      </div>

      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {videos.map((v) => (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="rounded-[14px] overflow-hidden border flex flex-col"
                style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
              >
                <div className="relative aspect-video flex items-center justify-center" style={{ background: "var(--color-canvas)" }}>
                  {v.status === "completed" && v.dataUrl ? (
                    <video src={v.dataUrl} controls loop className="w-full h-full object-cover" />
                  ) : v.status === "failed" ? (
                    <div className="flex flex-col items-center gap-2 px-4 text-center">
                      <Icon name="alert-triangle" size={22} style={{ color: "#dc2626" }} />
                      <p className="text-[12px]" style={{ color: "#991b1b" }}>{v.error ?? "Gagal."}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5">
                      <Icon name="spinner" size={24} spin style={{ color: "var(--color-primary)" }} />
                      <p className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>{STATUS_LABEL[v.status]}</p>
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-2">
                  <p className="text-[12.5px] line-clamp-2" style={{ color: "var(--color-body)" }}>{v.prompt}</p>
                  <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-muted-soft)" }}>
                    <span>{v.model}</span>·<span>{v.seconds}s</span>·<span>{v.size}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {v.status === "completed" && v.dataUrl && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => download(v.dataUrl!, `video-${v.id}.mp4`)}>
                        <Icon name="download" size={12} /> Unduh
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(v)} aria-label="Hapus">
                      <Icon name="trash" size={12} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-16">
          <Icon name="film" size={32} style={{ color: "var(--color-muted-soft)" }} />
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-muted)" }}>Belum ada video. Tulis prompt di atas untuk mulai.</p>
        </div>
      )}
    </ShellLayout>
  );
}
