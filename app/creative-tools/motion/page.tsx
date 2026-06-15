"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { uploadMedia } from "@/lib/supabase";
import {
  useMotionStore,
  type MotionProject,
  type MotionLayer,
  type LayerKind,
  type AnimPreset,
  type Easing,
  type CanvasRatio,
} from "@/lib/creativeStore";

// ─── Geometry ─────────────────────────────────────────────────────
const DIMS: Record<CanvasRatio, { w: number; h: number }> = {
  "1:1": { w: 720, h: 720 },
  "16:9": { w: 1280, h: 720 },
  "9:16": { w: 720, h: 1280 },
};

// ─── Animation engine ─────────────────────────────────────────────
const EASE: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  "ease-in": (t) => t * t,
  "ease-out": (t) => 1 - (1 - t) * (1 - t),
  "ease-in-out": (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function bounceOut(t: number) {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

interface Transform { opacity: number; dx: number; dy: number; scale: number; rotate: number; }

function computeTransform(layer: MotionLayer, time: number): Transform {
  const base: Transform = { opacity: 1, dx: 0, dy: 0, scale: 1, rotate: 0 };
  if (layer.preset === "none") return base;

  const raw = clamp01((time - layer.delay) / Math.max(0.0001, layer.duration));
  const OFF = 120;

  if (layer.preset === "bounce") {
    const p = bounceOut(raw);
    return { ...base, opacity: clamp01(raw * 2), dy: (1 - p) * -OFF };
  }

  const p = EASE[layer.easing](raw);
  switch (layer.preset) {
    case "fade": return { ...base, opacity: p };
    case "slide-up": return { ...base, opacity: p, dy: (1 - p) * OFF };
    case "slide-down": return { ...base, opacity: p, dy: (1 - p) * -OFF };
    case "slide-left": return { ...base, opacity: p, dx: (1 - p) * OFF };
    case "slide-right": return { ...base, opacity: p, dx: (1 - p) * -OFF };
    case "pop": return { ...base, opacity: p, scale: 0.6 + 0.4 * p };
    case "rotate": return { ...base, opacity: p, scale: 0.9 + 0.1 * p, rotate: (1 - p) * -0.26 };
    default: return base;
  }
}

// ─── Presets / options ────────────────────────────────────────────
const PRESETS: { value: AnimPreset; label: string }[] = [
  { value: "none", label: "Tanpa animasi" },
  { value: "fade", label: "Fade In" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "pop", label: "Pop / Scale" },
  { value: "rotate", label: "Rotate In" },
  { value: "bounce", label: "Bounce" },
];
const EASINGS: { value: Easing; label: string }[] = [
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-in-out", label: "Ease In-Out" },
  { value: "linear", label: "Linear" },
];

// ─── Image cache (shared across renders) ──────────────────────────
const imgCache = new Map<string, HTMLImageElement>();
function getImage(src: string, onLoad: () => void): HTMLImageElement | null {
  const cached = imgCache.get(src);
  if (cached) return cached.complete ? cached : null;
  const img = new window.Image();
  // Remote (Storage) images must be CORS-enabled or drawing them taints the
  // canvas and breaks WebM export. Data URLs are same-origin, so skip it there.
  if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
  img.onload = onLoad;
  img.src = src;
  imgCache.set(src, img);
  return null;
}

// ─── Canvas drawing ───────────────────────────────────────────────
function drawFrame(
  ctx: CanvasRenderingContext2D,
  project: MotionProject,
  time: number,
  onImgLoad: () => void
) {
  const { w, h } = DIMS[project.ratio];
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = project.bg;
  ctx.fillRect(0, 0, w, h);

  for (const layer of project.layers) {
    const t = computeTransform(layer, time);
    if (t.opacity <= 0.001) continue;
    const cx = layer.x + layer.w / 2;
    const cy = layer.y + layer.h / 2;

    ctx.save();
    ctx.globalAlpha = t.opacity;
    ctx.translate(cx + t.dx, cy + t.dy);
    ctx.rotate(t.rotate);
    ctx.scale(t.scale, t.scale);
    ctx.translate(-layer.w / 2, -layer.h / 2);

    if (layer.kind === "rect") {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.roundRect(0, 0, layer.w, layer.h, layer.radius ?? 0);
      ctx.fill();
    } else if (layer.kind === "circle") {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.ellipse(layer.w / 2, layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (layer.kind === "text") {
      ctx.fillStyle = layer.color;
      ctx.font = `700 ${layer.fontSize ?? 64}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(layer.text ?? "", layer.w / 2, layer.h / 2);
    } else if (layer.kind === "image" && layer.src) {
      const img = getImage(layer.src, onImgLoad);
      if (img) ctx.drawImage(img, 0, 0, layer.w, layer.h);
    }
    ctx.restore();
  }
}

// ─── Factory ──────────────────────────────────────────────────────
function newLayer(kind: LayerKind, ratio: CanvasRatio, src?: string): MotionLayer {
  const { w, h } = DIMS[ratio];
  const base = {
    id: crypto.randomUUID(),
    kind,
    color: kind === "text" ? "#1c1917" : "#7c6f64",
    preset: "fade" as AnimPreset,
    duration: 0.8,
    delay: 0,
    easing: "ease-out" as Easing,
  };
  if (kind === "text")
    return { ...base, x: w / 2 - 250, y: h / 2 - 50, w: 500, h: 100, text: "Teks Kamu", fontSize: 64 };
  if (kind === "rect")
    return { ...base, x: w / 2 - 150, y: h / 2 - 90, w: 300, h: 180, radius: 24 };
  if (kind === "circle")
    return { ...base, x: w / 2 - 110, y: h / 2 - 110, w: 220, h: 220 };
  return { ...base, x: w / 2 - 200, y: h / 2 - 150, w: 400, h: 300, src };
}

// ─── Editor ───────────────────────────────────────────────────────
function Editor({ project, onBack }: { project: MotionProject; onBack: () => void }) {
  const { updateProject, deleteProject } = useMotionStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const [playing, setPlaying] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // forces redraw on data change

  const { w: W, h: H } = DIMS[project.ratio];
  const selected = project.layers.find((l) => l.id === selectedId) ?? null;

  const patch = (p: Partial<MotionProject>) => updateProject(project.id, p);
  const patchLayer = (id: string, p: Partial<MotionLayer>) =>
    patch({ layers: project.layers.map((l) => (l.id === id ? { ...l, ...p } : l)) });

  const redraw = useCallback(
    (time: number) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      drawFrame(ctx, project, time, () => setTick((t) => t + 1));
    },
    [project]
  );

  // Preview loop. NOTE: `tick` is deliberately NOT a dependency — it bumps only
  // to force a one-shot redraw when an async image finishes loading. Including it
  // would tear down and recreate the rAF loop on every image load, resetting
  // `startRef` and snapping the animation back to t=0.
  useEffect(() => {
    if (exporting || !playing) return;
    startRef.current = performance.now();
    const loop = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      const t = elapsed % project.duration;
      redraw(t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, exporting, redraw, project.duration]);

  // Paused: show the final composed frame, and redraw once whenever a layer
  // image loads (tick) so it appears without needing to hit play.
  useEffect(() => {
    if (exporting || playing) return;
    redraw(project.duration);
  }, [playing, exporting, redraw, project.duration, tick]);

  // ── Pointer drag to reposition selected layer ──
  const drag = useRef<{ id: string; offX: number; offY: number } | null>(null);
  const toStage = (e: React.PointerEvent) => {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    const { x, y } = toStage(e);
    // hit-test top-most
    const hit = [...project.layers].reverse().find((l) => x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h);
    if (hit) {
      setSelectedId(hit.id);
      drag.current = { id: hit.id, offX: x - hit.x, offY: y - hit.y };
      (e.target as Element).setPointerCapture(e.pointerId);
      setPlaying(false);
    } else {
      setSelectedId(null);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const { x, y } = toStage(e);
    patchLayer(drag.current.id, { x: Math.round(x - drag.current.offX), y: Math.round(y - drag.current.offY) });
  };
  const onPointerUp = () => { drag.current = null; };

  // ── Add layers ──
  const addLayer = (kind: LayerKind, src?: string) => {
    const l = newLayer(kind, project.ratio, src);
    patch({ layers: [...project.layers, l] });
    setSelectedId(l.id);
    setPlaying(false);
  };
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    // Prefer a Storage URL so the persisted project stays small — embedding
    // base64 images can blow the localStorage quota and silently drop the save.
    const uploaded = await uploadMedia(file);
    if (uploaded) {
      addLayer("image", uploaded);
      return;
    }
    // Offline / not signed in: fall back to an inline data URL.
    const reader = new FileReader();
    reader.onload = () => addLayer("image", reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Export to WebM ──
  const exportWebM = async () => {
    const cv = canvasRef.current;
    if (!cv || exporting) return;
    setExporting(true);
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
    await new Promise((r) => setTimeout(r, 50));

    const stream = cv.captureStream(30);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);

    const done = new Promise<void>((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project.name || "motion"}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      };
    });

    rec.start();
    const ctx = cv.getContext("2d")!;
    const total = project.duration + 0.4; // small tail so the final state is visible
    const begin = performance.now();
    await new Promise<void>((resolve) => {
      const loop = () => {
        const t = (performance.now() - begin) / 1000;
        drawFrame(ctx, project, Math.min(t, project.duration), () => {});
        if (t >= total) resolve();
        else requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    rec.stop();
    await done;
    setExporting(false);
    setPlaying(true);
  };

  const replay = () => { setPlaying(false); setTimeout(() => setPlaying(true), 20); };

  const fieldLabel = "block text-[11px] font-bold uppercase tracking-wider mb-1.5";
  const numInput = "w-full rounded-[8px] border px-2.5 py-1.5 text-[13px] outline-none focus:ring-2";
  const numStyle = { background: "var(--color-surface)", borderColor: "var(--color-hairline)", color: "var(--color-body)" };

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="Creative Tools"
        title="Motion Editor"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onBack}>
              <Icon name="arrow-left" size={13} /> Semua Proyek
            </Button>
            <Button size="sm" onClick={exportWebM} disabled={exporting}>
              {exporting ? <><Icon name="spinner" size={13} spin /> Mengekspor…</> : <><Icon name="download" size={13} /> Ekspor WebM</>}
            </Button>
            <Button variant="danger" size="sm" onClick={() => { deleteProject(project.id); onBack(); }}>
              <Icon name="trash" size={13} /> Hapus
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* ── Stage ── */}
        <div className="flex flex-col gap-3">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap rounded-[12px] border p-2"
            style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
            <Button size="sm" variant="outline" onClick={() => addLayer("text")}><Icon name="type" size={13} /> Teks</Button>
            <Button size="sm" variant="outline" onClick={() => addLayer("rect")}><Icon name="square" size={13} /> Kotak</Button>
            <Button size="sm" variant="outline" onClick={() => addLayer("circle")}><Icon name="circle" size={13} /> Lingkaran</Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Icon name="image" size={13} /> Gambar</Button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
            <div className="w-px h-5 mx-1" style={{ background: "var(--color-hairline)" }} />
            <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)}>
              <Icon name={playing ? "pause" : "play"} size={13} /> {playing ? "Jeda" : "Main"}
            </Button>
            <Button size="sm" variant="outline" onClick={replay}><Icon name="rotate" size={13} /> Ulang</Button>
          </div>

          {/* Canvas */}
          <div className="rounded-[16px] border overflow-hidden flex items-center justify-center p-4"
            style={{ borderColor: "var(--color-hairline)", background: "var(--color-canvas)",
              backgroundImage: "radial-gradient(var(--color-hairline) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="rounded-[8px] shadow-lg touch-none cursor-move"
              style={{ maxWidth: "100%", maxHeight: "62vh", aspectRatio: `${W} / ${H}`, background: project.bg }}
            />
          </div>

          {/* Layers list */}
          <div className="rounded-[12px] border p-3" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Layer ({project.layers.length})</p>
            {project.layers.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>Tambahkan elemen dari toolbar di atas.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {[...project.layers].reverse().map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setSelectedId(l.id); setPlaying(false); }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
                    style={{ background: selectedId === l.id ? "var(--color-primary-light)" : "transparent",
                      color: selectedId === l.id ? "var(--color-primary-ink)" : "var(--color-body)" }}
                  >
                    <Icon name={l.kind === "text" ? "type" : l.kind === "rect" ? "square" : l.kind === "circle" ? "circle" : "image"} size={13}
                      style={{ color: selectedId === l.id ? "var(--color-primary)" : "var(--color-muted-soft)" }} />
                    <span className="text-[12.5px] font-medium flex-1 truncate">
                      {l.kind === "text" ? (l.text || "Teks") : l.kind === "rect" ? "Kotak" : l.kind === "circle" ? "Lingkaran" : "Gambar"}
                    </span>
                    <span className="text-[10.5px]" style={{ color: "var(--color-muted-soft)" }}>{l.preset}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Properties panel ── */}
        <div className="flex flex-col gap-4">
          {/* Stage settings */}
          <div className="rounded-[14px] border p-4" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
            <p className="text-[12px] font-bold mb-3" style={{ color: "var(--color-ink)" }}>Pengaturan Stage</p>
            <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Nama</label>
            <input value={project.name} onChange={(e) => patch({ name: e.target.value })} className={`${numInput} mb-3`} style={numStyle} />
            <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Rasio</label>
            <Select value={project.ratio} onChange={(e) => patch({ ratio: e.target.value as CanvasRatio })} className="mb-3">
              <option value="1:1">Persegi 1:1</option>
              <option value="16:9">Landscape 16:9</option>
              <option value="9:16">Potrait 9:16</option>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Background</label>
                <input type="color" value={project.bg} onChange={(e) => patch({ bg: e.target.value })} className="w-full h-9 rounded-[8px] border cursor-pointer" style={{ borderColor: "var(--color-hairline)" }} />
              </div>
              <div>
                <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Durasi (dtk)</label>
                <input type="number" min={0.5} max={20} step={0.5} value={project.duration}
                  onChange={(e) => patch({ duration: Math.max(0.5, Number(e.target.value)) })} className={numInput} style={numStyle} />
              </div>
            </div>
          </div>

          {/* Selected layer */}
          {selected ? (
            <div className="rounded-[14px] border p-4" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-bold" style={{ color: "var(--color-ink)" }}>Properti Layer</p>
                <button onClick={() => { patch({ layers: project.layers.filter((l) => l.id !== selected.id) }); setSelectedId(null); }}
                  className="text-[12px] font-semibold flex items-center gap-1" style={{ color: "#C64545" }}>
                  <Icon name="trash" size={12} /> Hapus
                </button>
              </div>

              {selected.kind === "text" && (
                <>
                  <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Teks</label>
                  <input value={selected.text ?? ""} onChange={(e) => patchLayer(selected.id, { text: e.target.value })} className={`${numInput} mb-3`} style={numStyle} />
                  <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Ukuran Font</label>
                  <input type="number" min={12} max={300} value={selected.fontSize ?? 64} onChange={(e) => patchLayer(selected.id, { fontSize: Number(e.target.value) })} className={`${numInput} mb-3`} style={numStyle} />
                </>
              )}
              {selected.kind === "rect" && (
                <>
                  <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Sudut (radius)</label>
                  <input type="number" min={0} max={400} value={selected.radius ?? 0} onChange={(e) => patchLayer(selected.id, { radius: Number(e.target.value) })} className={`${numInput} mb-3`} style={numStyle} />
                </>
              )}
              {selected.kind !== "image" && (
                <>
                  <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Warna</label>
                  <input type="color" value={selected.color} onChange={(e) => patchLayer(selected.id, { color: e.target.value })} className="w-full h-9 rounded-[8px] border cursor-pointer mb-3" style={{ borderColor: "var(--color-hairline)" }} />
                </>
              )}

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Lebar</label>
                  <input type="number" value={selected.w} onChange={(e) => patchLayer(selected.id, { w: Number(e.target.value) })} className={numInput} style={numStyle} />
                </div>
                <div>
                  <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Tinggi</label>
                  <input type="number" value={selected.h} onChange={(e) => patchLayer(selected.id, { h: Number(e.target.value) })} className={numInput} style={numStyle} />
                </div>
              </div>

              <div className="h-px my-3" style={{ background: "var(--color-hairline)" }} />
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>Animasi</p>
              <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Preset</label>
              <Select value={selected.preset} onChange={(e) => { patchLayer(selected.id, { preset: e.target.value as AnimPreset }); replay(); }} className="mb-3">
                {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Durasi (dtk)</label>
                  <input type="number" min={0.1} step={0.1} value={selected.duration} onChange={(e) => patchLayer(selected.id, { duration: Math.max(0.1, Number(e.target.value)) })} className={numInput} style={numStyle} />
                </div>
                <div>
                  <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Delay (dtk)</label>
                  <input type="number" min={0} step={0.1} value={selected.delay} onChange={(e) => patchLayer(selected.id, { delay: Math.max(0, Number(e.target.value)) })} className={numInput} style={numStyle} />
                </div>
              </div>
              <label className={fieldLabel} style={{ color: "var(--color-muted-soft)" }}>Easing</label>
              <Select value={selected.easing} onChange={(e) => { patchLayer(selected.id, { easing: e.target.value as Easing }); replay(); }}>
                {EASINGS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </div>
          ) : (
            <div className="rounded-[14px] border border-dashed p-6 text-center" style={{ borderColor: "var(--color-hairline)" }}>
              <Icon name="shapes" size={22} style={{ color: "var(--color-muted-soft)" }} />
              <p className="mt-2 text-[12.5px]" style={{ color: "var(--color-muted)" }}>Pilih layer di stage atau daftar untuk mengedit propertinya.</p>
            </div>
          )}
        </div>
      </div>
    </ShellLayout>
  );
}

// ─── Project hub ──────────────────────────────────────────────────
export default function MotionEditorPage() {
  const { projects, addProject, deleteProject } = useMotionStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = projects.find((p) => p.id === activeId) ?? null;

  const create = (ratio: CanvasRatio) => {
    const id = addProject({ name: "Untitled Motion", ratio, bg: "#faf4ec", duration: 3, layers: [] });
    setActiveId(id);
  };

  const ratios = useMemo(() => ([
    { value: "16:9" as CanvasRatio, label: "Landscape", sub: "16:9 · sosial / web" },
    { value: "1:1" as CanvasRatio, label: "Persegi", sub: "1:1 · Instagram" },
    { value: "9:16" as CanvasRatio, label: "Potrait", sub: "9:16 · Reels / Story" },
  ]), []);

  if (active) return <Editor project={active} onBack={() => setActiveId(null)} />;

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="Creative Tools"
        title="Motion Editor"
        subtitle="Buat micro-interaction — animasikan teks & shape, lalu ekspor ke video WebM."
        actions={
          <Link href="/creative-tools">
            <Button variant="outline"><Icon name="arrow-left" size={14} /> Creative Tools</Button>
          </Link>
        }
      />

      <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted-soft)" }}>Mulai proyek baru</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {ratios.map((r) => (
          <button key={r.value} onClick={() => create(r.value)}
            className="group rounded-[16px] border p-5 text-left transition-all hover:-translate-y-0.5"
            style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
            <div className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-3" style={{ background: "var(--color-primary-light)" }}>
              <Icon name="expand" size={20} style={{ color: "var(--color-primary-ink)" }} />
            </div>
            <p className="text-[15px] font-bold" style={{ color: "var(--color-ink)" }}>{r.label}</p>
            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--color-muted)" }}>{r.sub}</p>
          </button>
        ))}
      </div>

      {projects.length > 0 && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted-soft)" }}>Proyek tersimpan</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="group rounded-[16px] border p-4 flex flex-col" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold truncate" style={{ color: "var(--color-ink)" }}>{p.name}</h3>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>{p.ratio} · {p.layers.length} layer · {p.duration}s</p>
                  </div>
                  <button onClick={() => deleteProject(p.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--color-muted-soft)" }} aria-label="Hapus">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <Button variant="outline" size="sm" className="mt-auto w-full" onClick={() => setActiveId(p.id)}>
                  <Icon name="edit" size={13} /> Buka Editor
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </ShellLayout>
  );
}
