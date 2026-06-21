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
  type AnimOut,
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

const OFF = 120;

const layerInEnd = (l: MotionLayer) => l.delay + l.duration;
const layerOutStart = (l: MotionLayer, total: number) => {
  if (!l.outPreset || l.outPreset === "none") return total;
  const dur = l.outDuration ?? 0.6;
  return l.outStart ?? Math.max(layerInEnd(l), total - dur);
};
const DEG = Math.PI / 180;

function applyIn(tr: Transform, layer: MotionLayer, p: number) {
  switch (layer.preset) {
    case "fade": tr.opacity = p; break;
    case "slide-up": tr.opacity = p; tr.dy = (1 - p) * OFF; break;
    case "slide-down": tr.opacity = p; tr.dy = (1 - p) * -OFF; break;
    case "slide-left": tr.opacity = p; tr.dx = (1 - p) * OFF; break;
    case "slide-right": tr.opacity = p; tr.dx = (1 - p) * -OFF; break;
    case "pop": tr.opacity = p; tr.scale = 0.6 + 0.4 * p; break;
    case "rotate": tr.opacity = p; tr.scale = 0.9 + 0.1 * p; tr.rotate = (1 - p) * -0.26; break;
    case "custom": {
      const fDX = layer.fromDX ?? 0, fDY = layer.fromDY ?? 0;
      const fS = layer.fromScale ?? 1, fR = (layer.fromRotate ?? 0) * DEG;
      const fO = layer.fromOpacity ?? 0;
      tr.dx = fDX * (1 - p);
      tr.dy = fDY * (1 - p);
      tr.scale = fS + (1 - fS) * p;
      tr.rotate = fR * (1 - p);
      tr.opacity = fO + (1 - fO) * p;
      break;
    }
  }
}

function applyOut(tr: Transform, layer: MotionLayer, q: number) {
  switch (layer.outPreset) {
    case "fade-out": tr.opacity *= 1 - q; break;
    case "slide-up-out": tr.opacity *= 1 - q; tr.dy += q * -OFF; break;
    case "slide-down-out": tr.opacity *= 1 - q; tr.dy += q * OFF; break;
    case "slide-left-out": tr.opacity *= 1 - q; tr.dx += q * -OFF; break;
    case "slide-right-out": tr.opacity *= 1 - q; tr.dx += q * OFF; break;
    case "pop-out": tr.opacity *= 1 - q; tr.scale *= 1 - 0.4 * q; break;
    case "rotate-out": tr.opacity *= 1 - q; tr.rotate += q * 0.26; break;
    case "custom-out": {
      const tDX = layer.toDX ?? 0, tDY = layer.toDY ?? 0;
      const tS = layer.toScale ?? 1, tR = (layer.toRotate ?? 0) * DEG;
      const tO = layer.toOpacity ?? 0;
      tr.dx += tDX * q;
      tr.dy += tDY * q;
      tr.scale *= 1 + (tS - 1) * q;
      tr.rotate += tR * q;
      tr.opacity *= 1 - q * (1 - tO);
      break;
    }
  }
}

function computeTransform(layer: MotionLayer, time: number, total: number): Transform {
  const tr: Transform = { opacity: 1, dx: 0, dy: 0, scale: 1, rotate: 0 };
  if (layer.preset !== "none" && time < layer.delay) { tr.opacity = 0; return tr; }
  if (layer.preset !== "none") {
    const raw = clamp01((time - layer.delay) / Math.max(0.0001, layer.duration));
    if (layer.preset === "bounce") {
      const p = bounceOut(raw);
      tr.opacity = clamp01(raw * 2);
      tr.dy = (1 - p) * -OFF;
    } else {
      applyIn(tr, layer, EASE[layer.easing](raw));
    }
  }
  if (layer.outPreset && layer.outPreset !== "none") {
    const start = layerOutStart(layer, total);
    const dur = layer.outDuration ?? 0.6;
    if (time >= start) {
      const q = EASE[layer.outEasing ?? "ease-in"](clamp01((time - start) / Math.max(0.0001, dur)));
      applyOut(tr, layer, q);
    }
  }
  return tr;
}

// ─── Presets ──────────────────────────────────────────────────────
type TemplateDef = { value: AnimPreset; label: string };
const IN_TEMPLATES: TemplateDef[] = [
  { value: "none", label: "Langsung" },
  { value: "fade", label: "Fade In" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "pop", label: "Pop" },
  { value: "rotate", label: "Rotate" },
  { value: "bounce", label: "Bounce" },
  { value: "custom", label: "Custom" },
];
type OutTemplateDef = { value: AnimOut; label: string };
const OUT_TEMPLATES: OutTemplateDef[] = [
  { value: "none", label: "Tidak ada" },
  { value: "fade-out", label: "Fade Out" },
  { value: "slide-up-out", label: "Slide Up" },
  { value: "slide-down-out", label: "Slide Down" },
  { value: "slide-left-out", label: "Slide Left" },
  { value: "slide-right-out", label: "Slide Right" },
  { value: "pop-out", label: "Pop Out" },
  { value: "rotate-out", label: "Rotate Out" },
  { value: "custom-out", label: "Custom" },
];
const EASINGS: { value: Easing; label: string }[] = [
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-in-out", label: "Ease In-Out" },
  { value: "linear", label: "Linear" },
];

// ─── Image cache ──────────────────────────────────────────────────
const imgCache = new Map<string, HTMLImageElement>();
function getImage(src: string, onLoad: () => void): HTMLImageElement | null {
  const cached = imgCache.get(src);
  if (cached) return cached.complete ? cached : null;
  const img = new window.Image();
  if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
  img.onload = onLoad;
  img.src = src;
  imgCache.set(src, img);
  return null;
}

// Build a CSS filter string from a layer's static-effect props (or "" for none).
function layerFilter(l: MotionLayer): string {
  const parts: string[] = [];
  if (l.blur && l.blur > 0) parts.push(`blur(${l.blur}px)`);
  if (l.grayscale && l.grayscale > 0) parts.push(`grayscale(${l.grayscale})`);
  if (l.sepia && l.sepia > 0) parts.push(`sepia(${l.sepia})`);
  if (l.saturate !== undefined && l.saturate !== 1) parts.push(`saturate(${l.saturate})`);
  if (l.brightness !== undefined && l.brightness !== 1) parts.push(`brightness(${l.brightness})`);
  if (l.contrast !== undefined && l.contrast !== 1) parts.push(`contrast(${l.contrast})`);
  return parts.join(" ");
}

// ─── Canvas drawing ───────────────────────────────────────────────
function drawFrame(ctx: CanvasRenderingContext2D, project: MotionProject, time: number, onImgLoad: () => void) {
  const { w, h } = DIMS[project.ratio];
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = project.bg;
  ctx.fillRect(0, 0, w, h);
  for (const layer of project.layers) {
    const t = computeTransform(layer, time, project.duration);
    if (t.opacity <= 0.001) continue;
    const cx = layer.x + layer.w / 2;
    const cy = layer.y + layer.h / 2;
    ctx.save();
    ctx.globalAlpha = t.opacity;
    ctx.translate(cx + t.dx, cy + t.dy);
    ctx.rotate(t.rotate);
    ctx.scale(t.scale, t.scale);
    ctx.translate(-layer.w / 2, -layer.h / 2);
    // Static visual effects (canvas filters). Built once per layer.
    const filter = layerFilter(layer);
    if (filter) ctx.filter = filter;
    const sw = layer.strokeWidth ?? 0;
    if (layer.kind === "rect") {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.roundRect(0, 0, layer.w, layer.h, layer.radius ?? 0);
      ctx.fill();
      if (sw > 0) { ctx.lineWidth = sw; ctx.strokeStyle = layer.strokeColor ?? "#000"; ctx.stroke(); }
    } else if (layer.kind === "circle") {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.ellipse(layer.w / 2, layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (sw > 0) { ctx.lineWidth = sw; ctx.strokeStyle = layer.strokeColor ?? "#000"; ctx.stroke(); }
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
    id: crypto.randomUUID(), kind,
    color: kind === "text" ? "#1c1917" : "#7c6f64",
    preset: "fade" as AnimPreset, duration: 0.8, delay: 0, easing: "ease-out" as Easing,
    outPreset: "none" as AnimOut, outDuration: 0.6, outEasing: "ease-in" as Easing,
  };
  if (kind === "text") return { ...base, x: w / 2 - 250, y: h / 2 - 50, w: 500, h: 100, text: "Teks Kamu", fontSize: 64 };
  if (kind === "rect") return { ...base, x: w / 2 - 150, y: h / 2 - 90, w: 300, h: 180, radius: 24 };
  if (kind === "circle") return { ...base, x: w / 2 - 110, y: h / 2 - 110, w: 220, h: 220 };
  return { ...base, x: w / 2 - 200, y: h / 2 - 150, w: 400, h: 300, src };
}

// ─── Full-page Editor ─────────────────────────────────────────────
function Editor({ project, onBack }: { project: MotionProject; onBack: () => void }) {
  const { updateProject, deleteProject } = useMotionStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const playheadRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timeLabelRef = useRef<HTMLSpanElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrubTime, setScrubTime] = useState(0);
  const [tick, setTick] = useState(0);
  // Design vs Animate mode
  const [layerTab, setLayerTab] = useState<"design" | "animate">("design");
  type AnimView = "list" | "picker" | "detail";
  const [animView, setAnimView] = useState<AnimView>("list");
  type AnimProp = "scale" | "rotate" | "move" | "opacity" | "color" | "layer-blur" | "corner-radius" | "stroke";
  const [animProp, setAnimProp] = useState<AnimProp | null>(null);
  // Timeline height (drag top edge up to expand)
  const [timelineH, setTimelineH] = useState(160);
  const tlResizing = useRef(false);
  const tlResizeStart = useRef({ y: 0, h: 0 });
  // Canvas zoom
  const [zoom, setZoom] = useState(1);

  const { w: W, h: H } = DIMS[project.ratio];
  const selected = project.layers.find((l) => l.id === selectedId) ?? null;

  const patch = (p: Partial<MotionProject>) => updateProject(project.id, p);
  const patchLayer = (id: string, p: Partial<MotionLayer>) =>
    patch({ layers: project.layers.map((l) => (l.id === id ? { ...l, ...p } : l)) });

  const redraw = useCallback((time: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    drawFrame(ctx, project, time, () => setTick((t) => t + 1));
  }, [project]);

  useEffect(() => {
    if (exporting || !playing) return;
    startRef.current = performance.now();
    const loop = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      const t = elapsed % project.duration;
      timeRef.current = t;
      redraw(t);
      if (playheadRef.current) playheadRef.current.style.left = `${(t / project.duration) * 100}%`;
      if (timeLabelRef.current) timeLabelRef.current.textContent = t.toFixed(2);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, exporting, redraw, project.duration]);

  useEffect(() => {
    if (exporting || playing) return;
    redraw(scrubTime);
    if (playheadRef.current) playheadRef.current.style.left = `${(scrubTime / project.duration) * 100}%`;
    if (timeLabelRef.current) timeLabelRef.current.textContent = scrubTime.toFixed(2);
  }, [playing, exporting, redraw, project.duration, scrubTime, tick]);

  const togglePlay = () => {
    if (playing) { setScrubTime(timeRef.current); setPlaying(false); }
    else setPlaying(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement | null)?.isContentEditable;
      if (typing) return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // ── Timeline scrubbing ──
  const pxToTime = (clientX: number) => {
    const el = timelineRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return clamp01((clientX - r.left) / r.width) * project.duration;
  };
  const scrubbing = useRef(false);
  const onScrubDown = (e: React.PointerEvent) => {
    setPlaying(false); scrubbing.current = true;
    setScrubTime(pxToTime(e.clientX));
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onScrubMove = (e: React.PointerEvent) => { if (scrubbing.current) setScrubTime(pxToTime(e.clientX)); };
  const onScrubUp = () => { scrubbing.current = false; };

  // ── Resize handles ──
  const resizing = useRef<{ handle: string; sx: number; sy: number; box: { x: number; y: number; w: number; h: number } } | null>(null);
  const onHandleDown = (e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    if (!selected) return;
    setPlaying(false);
    resizing.current = { handle, sx: e.clientX, sy: e.clientY, box: { x: selected.x, y: selected.y, w: selected.w, h: selected.h } };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    const r = resizing.current;
    const cv = canvasRef.current;
    if (!r || !cv || !selected) return;
    const rect = cv.getBoundingClientRect();
    const dx = ((e.clientX - r.sx) / rect.width) * W;
    const dy = ((e.clientY - r.sy) / rect.height) * H;
    let { x, y, w, h } = r.box;
    const hd = r.handle;
    if (hd.includes("e")) w = r.box.w + dx;
    if (hd.includes("s")) h = r.box.h + dy;
    if (hd.includes("w")) { x = r.box.x + dx; w = r.box.w - dx; }
    if (hd.includes("n")) { y = r.box.y + dy; h = r.box.h - dy; }
    const MIN = 20;
    if (w < MIN) { if (hd.includes("w")) x = r.box.x + r.box.w - MIN; w = MIN; }
    if (h < MIN) { if (hd.includes("n")) y = r.box.y + r.box.h - MIN; h = MIN; }
    patchLayer(selected.id, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
  };
  const onHandleUp = () => { resizing.current = null; };

  // ── Timeline bar drag — move OR resize either edge (keyframe editing) ──
  // edge: "move" shifts the whole bar; "start"/"end" trim it so the timeframe
  // (entry/exit duration) can be shortened or lengthened by dragging the edges.
  type BarEdge = "move" | "start" | "end";
  const barDrag = useRef<{
    id: string; type: "in" | "out"; edge: BarEdge; startX: number;
    origStart: number; origDur: number;
  } | null>(null);
  const onBarDown = (e: React.PointerEvent, l: MotionLayer, type: "in" | "out", edge: BarEdge) => {
    e.stopPropagation();
    setSelectedId(l.id); setPlaying(false);
    barDrag.current = {
      id: l.id, type, edge, startX: e.clientX,
      origStart: type === "in" ? l.delay : layerOutStart(l, project.duration),
      origDur: type === "in" ? l.duration : (l.outDuration ?? 0.6),
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onBarMove = (e: React.PointerEvent) => {
    const d = barDrag.current;
    if (!d) return;
    const el = timelineRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dt = ((e.clientX - d.startX) / r.width) * project.duration;
    const l = project.layers.find((x) => x.id === d.id);
    if (!l) return;
    const MIN = 0.1;
    if (d.type === "in") {
      if (d.edge === "move") {
        patchLayer(d.id, { delay: Math.max(0, Math.min(project.duration - l.duration, d.origStart + dt)) });
      } else if (d.edge === "start") {
        // Move the start (delay) but keep the END fixed → changes duration.
        const end = d.origStart + d.origDur;
        const delay = Math.max(0, Math.min(end - MIN, d.origStart + dt));
        patchLayer(d.id, { delay, duration: Math.max(MIN, end - delay) });
      } else {
        // Drag end → change duration only.
        const dur = Math.max(MIN, Math.min(project.duration - d.origStart, d.origDur + dt));
        patchLayer(d.id, { duration: dur });
      }
    } else {
      if (d.edge === "move") {
        const dur = l.outDuration ?? 0.6;
        patchLayer(d.id, { outStart: Math.max(layerInEnd(l), Math.min(project.duration - dur, d.origStart + dt)) });
      } else if (d.edge === "start") {
        const end = d.origStart + d.origDur;
        const start = Math.max(layerInEnd(l), Math.min(end - MIN, d.origStart + dt));
        patchLayer(d.id, { outStart: start, outDuration: Math.max(MIN, end - start) });
      } else {
        const dur = Math.max(MIN, Math.min(project.duration - d.origStart, d.origDur + dt));
        patchLayer(d.id, { outDuration: dur });
      }
    }
  };
  const onBarUp = () => { barDrag.current = null; };

  // ── Timeline resize (drag top edge upward) ──
  const onTlResizeDown = (e: React.PointerEvent) => {
    tlResizing.current = true;
    tlResizeStart.current = { y: e.clientY, h: timelineH };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onTlResizeMove = (e: React.PointerEvent) => {
    if (!tlResizing.current) return;
    const dy = tlResizeStart.current.y - e.clientY;
    setTimelineH(Math.max(80, Math.min(400, tlResizeStart.current.h + dy)));
  };
  const onTlResizeUp = () => { tlResizing.current = false; };

  // ── Canvas zoom (Ctrl+wheel) ──
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => Math.max(0.25, Math.min(3, z - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Canvas pointer drag ──
  const drag = useRef<{ id: string; offX: number; offY: number } | null>(null);
  const toStage = (e: React.PointerEvent) => {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    const { x, y } = toStage(e);
    const hit = [...project.layers].reverse().find((l) => x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h);
    if (hit) {
      setSelectedId(hit.id);
      drag.current = { id: hit.id, offX: x - hit.x, offY: y - hit.y };
      (e.target as Element).setPointerCapture(e.pointerId);
      setPlaying(false);
    } else { setSelectedId(null); }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const { x, y } = toStage(e);
    patchLayer(drag.current.id, { x: Math.round(x - drag.current.offX), y: Math.round(y - drag.current.offY) });
  };
  const onPointerUp = () => { drag.current = null; };

  const deleteLayer = (id: string) => {
    patch({ layers: project.layers.filter((l) => l.id !== id) });
    setSelectedId((cur) => (cur === id ? null : cur));
  };
  const addLayer = (kind: LayerKind, src?: string) => {
    const l = newLayer(kind, project.ratio, src);
    patch({ layers: [...project.layers, l] });
    setSelectedId(l.id); setPlaying(false);
  };
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const uploaded = await uploadMedia(file);
    if (uploaded) { addLayer("image", uploaded); return; }
    const reader = new FileReader();
    reader.onload = () => addLayer("image", reader.result as string);
    reader.readAsDataURL(file);
  };

  const exportWebM = async () => {
    const cv = canvasRef.current;
    if (!cv || exporting) return;
    setExporting(true); setPlaying(false); cancelAnimationFrame(rafRef.current);
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
        a.href = url; a.download = `${project.name || "motion"}.webm`; a.click();
        URL.revokeObjectURL(url); resolve();
      };
    });
    rec.start();
    const ctx = cv.getContext("2d")!;
    const total = project.duration + 0.4;
    const begin = performance.now();
    await new Promise<void>((resolve) => {
      const loop = () => {
        const t = (performance.now() - begin) / 1000;
        drawFrame(ctx, project, Math.min(t, project.duration), () => {});
        if (t >= total) resolve(); else requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    rec.stop(); await done;
    setExporting(false); setPlaying(true);
  };

  const replay = () => { setScrubTime(0); setPlaying(false); setTimeout(() => setPlaying(true), 20); };

  const layerLabel = (l: MotionLayer) => l.kind === "text" ? (l.text?.slice(0, 14) || "Teks") : l.kind === "rect" ? "Kotak" : l.kind === "circle" ? "Lingkaran" : "Gambar";
  const layerIcon = (l: MotionLayer) => l.kind === "text" ? "type" : l.kind === "rect" ? "square" : l.kind === "circle" ? "circle" : "image";
  const pct = (t: number) => `${(t / project.duration) * 100}%`;
  const tickStep = project.duration > 8 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let t = 0; t <= project.duration + 0.0001; t += tickStep) ticks.push(Number(t.toFixed(2)));

  const fieldLabel = "block text-[10px] font-bold uppercase tracking-wider mb-1";
  const numInput = "w-full rounded-[6px] border px-2 py-1 text-[12px] outline-none focus:ring-1";
  const numStyle = { background: "#1e1e1e", borderColor: "#3a3a3a", color: "#e8e8e8" };
  const fieldLabelStyle = { color: "#8a8a8a" };

  // ── Full-page layout (dark, Figma-like) ──────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "#1a1a1a", color: "#e0e0e0", fontFamily: "ui-sans-serif, system-ui, sans-serif", zIndex: 50 }}>

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-3 h-11 border-b flex-shrink-0" style={{ background: "#242424", borderColor: "#333" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium hover:bg-white/10 transition-colors" style={{ color: "#aaa" }}>
          <Icon name="arrow-left" size={13} /> Kembali
        </button>

        <div className="w-px h-5" style={{ background: "#333" }} />

        <input
          value={project.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="text-[13px] font-semibold bg-transparent border-none outline-none w-40 truncate"
          style={{ color: "#e8e8e8" }}
        />

        <div className="flex-1" />

        {/* Playback controls */}
        <button onClick={replay} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Ulang (restart)" style={{ color: "#aaa" }}>
          <Icon name="skip-back" size={14} />
        </button>
        <button onClick={togglePlay} className="flex items-center justify-center w-7 h-7 rounded-full transition-colors" style={{ background: playing ? "#5a9" : "#444" }} title="Play/Pause (Space)">
          <Icon name={playing ? "pause" : "play"} size={13} style={{ color: "#fff" }} />
        </button>
        <span className="text-[11px] tabular-nums min-w-[64px] text-center" style={{ color: "#888" }}>
          <span ref={timeLabelRef}>{scrubTime.toFixed(2)}</span>s / {project.duration.toFixed(1)}s
        </span>

        <div className="w-px h-5" style={{ background: "#333" }} />

        <button onClick={exportWebM} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors disabled:opacity-50" style={{ background: "#2d5a4a", color: "#7ecfb0" }}>
          {exporting ? <><Icon name="spinner" size={12} spin /> Ekspor…</> : <><Icon name="download" size={12} /> Ekspor WebM</>}
        </button>
        <button onClick={() => { if (confirm("Hapus proyek ini?")) { deleteProject(project.id); onBack(); } }} className="p-1.5 rounded hover:bg-red-900/40 transition-colors" style={{ color: "#c46" }}>
          <Icon name="trash" size={14} />
        </button>
      </div>

      {/* ── Main area (left panel + canvas + right panel) ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel: Layers ── */}
        <div className="flex flex-col flex-shrink-0 border-r overflow-hidden" style={{ width: 200, background: "#1e1e1e", borderColor: "#333" }}>
          {/* Add layer buttons */}
          <div className="p-2 border-b" style={{ borderColor: "#333" }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: "#666" }}>Tambah Elemen</p>
            <div className="grid grid-cols-2 gap-1">
              {([
                { kind: "text" as LayerKind, label: "Teks", icon: "type" },
                { kind: "rect" as LayerKind, label: "Kotak", icon: "square" },
                { kind: "circle" as LayerKind, label: "Lingkaran", icon: "circle" },
                { kind: "image" as LayerKind, label: "Gambar", icon: "image" },
              ]).map((item) => (
                <button key={item.kind}
                  onClick={() => item.kind === "image" ? fileRef.current?.click() : addLayer(item.kind)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors hover:bg-white/10"
                  style={{ color: "#bbb" }}>
                  <Icon name={item.icon as never} size={11} style={{ color: "#888" }} />
                  {item.label}
                </button>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
          </div>

          {/* Layers list */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2 border-b" style={{ borderColor: "#333" }}>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#666" }}>Layer ({project.layers.length})</p>
            </div>
            {project.layers.length === 0 ? (
              <p className="text-[11px] px-3 py-4 text-center" style={{ color: "#555" }}>Belum ada layer</p>
            ) : (
              <div className="py-1">
                {[...project.layers].reverse().map((l) => {
                  const isSel = selectedId === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedId(l.id); setPlaying(false); setScrubTime(timeRef.current); }}
                      className="group/layer w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                      style={{ background: isSel ? "#2a3d33" : "transparent" }}
                    >
                      <Icon name={layerIcon(l) as never} size={12} style={{ color: isSel ? "#7ecfb0" : "#666", flexShrink: 0 }} />
                      <span className="text-[12px] font-medium flex-1 truncate" style={{ color: isSel ? "#c2f0df" : "#bbb" }}>{layerLabel(l)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteLayer(l.id); }}
                        className="opacity-0 group-hover/layer:opacity-100 p-0.5 rounded transition-opacity hover:bg-red-900/60"
                        style={{ color: "#c46", flexShrink: 0 }}
                      >
                        <Icon name="trash" size={10} />
                      </button>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stage settings (bottom of left panel) */}
          <div className="border-t p-3 flex flex-col gap-2" style={{ borderColor: "#333" }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#666" }}>Stage</p>
            <div>
              <label className={fieldLabel} style={fieldLabelStyle}>Rasio</label>
              <Select value={project.ratio} onChange={(e) => patch({ ratio: e.target.value as CanvasRatio })} className="!text-[12px] !py-1">
                <option value="1:1">1:1 Persegi</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="9:16">9:16 Potrait</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={fieldLabel} style={fieldLabelStyle}>Durasi</label>
                <input type="number" min={0.5} max={20} step={0.5} value={project.duration}
                  onChange={(e) => patch({ duration: Math.max(0.5, Number(e.target.value)) })}
                  className={numInput} style={numStyle} />
              </div>
              <div>
                <label className={fieldLabel} style={fieldLabelStyle}>BG</label>
                <input type="color" value={project.bg} onChange={(e) => patch({ bg: e.target.value })}
                  className="w-full h-[30px] rounded-[6px] border cursor-pointer" style={{ borderColor: "#3a3a3a" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Center: Canvas ── */}
        <div ref={canvasWrapRef} className="flex-1 overflow-hidden flex items-center justify-center relative"
          style={{ background: "#111", backgroundImage: "radial-gradient(#2a2a2a 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 z-20" style={{ background: "rgba(24,24,24,0.92)", borderRadius: 8, padding: "3px 8px", border: "1px solid #333" }}>
            <button onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-base leading-none" style={{ color: "#aaa" }}>−</button>
            <span className="text-[11px] tabular-nums min-w-[38px] text-center" style={{ color: "#888" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-base leading-none" style={{ color: "#aaa" }}>+</button>
            <div className="w-px h-4 mx-1" style={{ background: "#333" }} />
            <button onClick={() => setZoom(1)} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/10" style={{ color: "#888" }}>Fit</button>
          </div>

          <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center", lineHeight: 0 }}>
            <div className="relative" style={{ lineHeight: 0 }}>
              <canvas
                ref={canvasRef}
                width={W} height={H}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="rounded-[8px] shadow-2xl touch-none cursor-move"
                style={{ display: "block", maxWidth: `${Math.floor((100 / zoom))}%`, maxHeight: `calc((100vh - 11rem - 44px) / ${zoom})`, aspectRatio: `${W} / ${H}`, background: project.bg, width: "min(700px, 60vw)" }}
              />
              {/* Selection handles */}
              {selected && !playing && (
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute"
                    onPointerMove={onHandleMove}
                    onPointerUp={onHandleUp}
                    style={{
                      left: `${(selected.x / W) * 100}%`, top: `${(selected.y / H) * 100}%`,
                      width: `${(selected.w / W) * 100}%`, height: `${(selected.h / H) * 100}%`,
                      border: "1.5px solid #5cf0a0", boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
                      pointerEvents: "none",
                    }}>
                    {[
                      { id: "nw", l: 0, t: 0, c: "nwse-resize" }, { id: "n", l: 0.5, t: 0, c: "ns-resize" }, { id: "ne", l: 1, t: 0, c: "nesw-resize" },
                      { id: "e", l: 1, t: 0.5, c: "ew-resize" }, { id: "se", l: 1, t: 1, c: "nwse-resize" }, { id: "s", l: 0.5, t: 1, c: "ns-resize" },
                      { id: "sw", l: 0, t: 1, c: "nesw-resize" }, { id: "w", l: 0, t: 0.5, c: "ew-resize" },
                    ].map((hnd) => (
                      <div key={hnd.id}
                        onPointerDown={(e) => onHandleDown(e, hnd.id)}
                        className="absolute rounded-sm touch-none"
                        style={{ left: `${hnd.l * 100}%`, top: `${hnd.t * 100}%`, width: 9, height: 9, transform: "translate(-50%,-50%)", background: "#fff", border: "1.5px solid #5cf0a0", cursor: hnd.c, pointerEvents: "auto" }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel: Design / Animate ── */}
        <div className="flex-shrink-0 border-l flex flex-col overflow-hidden" style={{ width: 264, background: "#1e1e1e", borderColor: "#333" }}>
          {selected ? (
            <>
              {/* Layer header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0" style={{ borderColor: "#333" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Icon name={layerIcon(selected) as never} size={13} style={{ color: "#7ecfb0", flexShrink: 0 }} />
                  <span className="text-[12px] font-semibold truncate" style={{ color: "#e8e8e8" }}>{layerLabel(selected)}</span>
                </div>
                <button onClick={() => deleteLayer(selected.id)} className="p-1 rounded hover:bg-red-900/40 transition-colors" style={{ color: "#c46" }}>
                  <Icon name="trash" size={12} />
                </button>
              </div>

              {/* Design / Animate switcher */}
              <div className="flex flex-shrink-0 border-b" style={{ borderColor: "#333" }}>
                {(["design", "animate"] as const).map((t) => {
                  const on = layerTab === t;
                  return (
                    <button key={t} onClick={() => { setLayerTab(t); if (t === "animate") { setAnimView("list"); setAnimProp(null); } }}
                      className="flex-1 py-2.5 text-[11px] font-semibold capitalize tracking-wide transition-colors relative"
                      style={{ color: on ? "#e8e8e8" : "#666", background: "transparent" }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                      {on && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: "#8a76ff" }} />}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto">

                {/* ═══ DESIGN TAB ═══ */}
                {layerTab === "design" && (
                  <div className="p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#666" }}>Transform</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div><label className={fieldLabel} style={fieldLabelStyle}>X</label><input type="number" value={selected.x} onChange={(e) => patchLayer(selected.id, { x: Number(e.target.value) })} className={numInput} style={numStyle} /></div>
                      <div><label className={fieldLabel} style={fieldLabelStyle}>Y</label><input type="number" value={selected.y} onChange={(e) => patchLayer(selected.id, { y: Number(e.target.value) })} className={numInput} style={numStyle} /></div>
                      <div><label className={fieldLabel} style={fieldLabelStyle}>Lebar</label><input type="number" value={selected.w} onChange={(e) => patchLayer(selected.id, { w: Number(e.target.value) })} className={numInput} style={numStyle} /></div>
                      <div><label className={fieldLabel} style={fieldLabelStyle}>Tinggi</label><input type="number" value={selected.h} onChange={(e) => patchLayer(selected.id, { h: Number(e.target.value) })} className={numInput} style={numStyle} /></div>
                    </div>
                    <div className="h-px mb-3" style={{ background: "#2a2a2a" }} />
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#666" }}>Style</p>
                    {selected.kind === "text" && (
                      <>
                        <label className={fieldLabel} style={fieldLabelStyle}>Teks</label>
                        <input value={selected.text ?? ""} onChange={(e) => patchLayer(selected.id, { text: e.target.value })} className={`${numInput} mb-2`} style={numStyle} />
                        <label className={fieldLabel} style={fieldLabelStyle}>Ukuran Font</label>
                        <input type="number" min={12} max={300} value={selected.fontSize ?? 64} onChange={(e) => patchLayer(selected.id, { fontSize: Number(e.target.value) })} className={`${numInput} mb-2`} style={numStyle} />
                      </>
                    )}
                    {selected.kind === "rect" && (
                      <>
                        <label className={fieldLabel} style={fieldLabelStyle}>Corner Radius</label>
                        <input type="number" min={0} max={400} value={selected.radius ?? 0} onChange={(e) => patchLayer(selected.id, { radius: Number(e.target.value) })} className={`${numInput} mb-2`} style={numStyle} />
                      </>
                    )}
                    {selected.kind !== "image" && (
                      <>
                        <label className={fieldLabel} style={fieldLabelStyle}>Warna</label>
                        <input type="color" value={selected.color} onChange={(e) => patchLayer(selected.id, { color: e.target.value })} className="w-full h-8 rounded-[6px] border cursor-pointer mb-2" style={{ borderColor: "#3a3a3a" }} />
                      </>
                    )}
                    {(selected.kind === "rect" || selected.kind === "circle") && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <label className={fieldLabel} style={fieldLabelStyle}>Stroke Warna</label>
                          <input type="color" value={selected.strokeColor ?? "#000000"} onChange={(e) => patchLayer(selected.id, { strokeColor: e.target.value })} className="w-full h-8 rounded-[6px] border cursor-pointer" style={{ borderColor: "#3a3a3a" }} />
                        </div>
                        <div>
                          <label className={fieldLabel} style={fieldLabelStyle}>Stroke Tebal</label>
                          <input type="number" min={0} max={60} value={selected.strokeWidth ?? 0} onChange={(e) => patchLayer(selected.id, { strokeWidth: Number(e.target.value) })} className={numInput} style={numStyle} />
                        </div>
                      </div>
                    )}
                    <div className="h-px my-3" style={{ background: "#2a2a2a" }} />
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#666" }}>Effects</p>
                    {([
                      { key: "blur" as const, label: "Layer Blur", min: 0, max: 40, step: 1, def: 0, unit: "px" },
                      { key: "brightness" as const, label: "Brightness", min: 0, max: 2, step: 0.05, def: 1, unit: "×" },
                      { key: "contrast" as const, label: "Contrast", min: 0, max: 2, step: 0.05, def: 1, unit: "×" },
                      { key: "saturate" as const, label: "Saturation", min: 0, max: 3, step: 0.05, def: 1, unit: "×" },
                      { key: "grayscale" as const, label: "Grayscale", min: 0, max: 1, step: 0.05, def: 0, unit: "" },
                      { key: "sepia" as const, label: "Sepia", min: 0, max: 1, step: 0.05, def: 0, unit: "" },
                    ]).map((fx) => {
                      const val = (selected[fx.key] as number | undefined) ?? fx.def;
                      return (
                        <div key={fx.key} className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-medium" style={{ color: "#aaa" }}>{fx.label}</label>
                            <span className="text-[10px] tabular-nums" style={{ color: "#888" }}>{val}{fx.unit}</span>
                          </div>
                          <input type="range" min={fx.min} max={fx.max} step={fx.step} value={val}
                            onChange={(e) => patchLayer(selected.id, { [fx.key]: Number(e.target.value) } as Partial<MotionLayer>)}
                            className="w-full" style={{ accentColor: "#8a76ff" }} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ═══ ANIMATE TAB ═══ */}
                {layerTab === "animate" && (
                  <>
                    {/* ── VIEW: list ── */}
                    {animView === "list" && (
                      <div className="p-3">
                        <button
                          onClick={() => setAnimView("picker")}
                          className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold mb-4 transition-colors hover:opacity-90"
                          style={{ background: "#7c6fff", color: "#fff" }}>
                          + New Animation
                        </button>
                        {/* Current preset summary cards */}
                        {selected.preset !== "none" && (
                          <div className="rounded-[10px] border mb-2 p-3 cursor-pointer hover:border-[#555] transition-colors"
                            style={{ borderColor: "#333", background: "#252525" }}
                            onClick={() => { setAnimView("picker"); }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[12px] font-semibold" style={{ color: "#e8e8e8" }}>Entry · {selected.preset}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: "#888" }}>{selected.duration}s · delay {selected.delay}s · {selected.easing}</p>
                              </div>
                              <span className="w-2 h-2 rounded-full" style={{ background: "#5cf0a0", flexShrink: 0 }} />
                            </div>
                          </div>
                        )}
                        {selected.outPreset && selected.outPreset !== "none" && (
                          <div className="rounded-[10px] border mb-2 p-3 cursor-pointer hover:border-[#555] transition-colors"
                            style={{ borderColor: "#333", background: "#252525" }}
                            onClick={() => { setAnimView("picker"); }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[12px] font-semibold" style={{ color: "#e8e8e8" }}>Exit · {selected.outPreset}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: "#888" }}>{selected.outDuration ?? 0.6}s · {selected.outEasing ?? "ease-in"}</p>
                              </div>
                              <span className="w-2 h-2 rounded-full" style={{ background: "#f0a05c", flexShrink: 0 }} />
                            </div>
                          </div>
                        )}

                        {selected.preset === "none" && (!selected.outPreset || selected.outPreset === "none") && (
                          <div className="rounded-[14px] p-4 mb-4" style={{ background: "#252525", border: "1px solid #333" }}>
                            <div className="text-2xl mb-2">🤖</div>
                            <p className="text-[13px] font-bold mb-1" style={{ color: "#e8e8e8" }}>Idea → Motion</p>
                            <p className="text-[11px] mb-3" style={{ color: "#888" }}>Buat animasi dari deskripsi teks, pilih preset, lalu sesuaikan.</p>
                            <button onClick={() => setAnimView("picker")} className="w-full py-2 rounded-[8px] text-[12px] font-semibold" style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444" }}>
                              ✦ Pilih Animasi
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── VIEW: picker ── */}
                    {animView === "picker" && (
                      <div className="p-3">
                        <button onClick={() => setAnimView("list")} className="flex items-center gap-1.5 text-[11px] mb-3 hover:opacity-80" style={{ color: "#888" }}>
                          <Icon name="arrow-left" size={11} /> Kembali
                        </button>
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#5cf0a0" }}>Animasi Masuk</p>
                        <div className="grid grid-cols-2 gap-1.5 mb-4">
                          {IN_TEMPLATES.map((t) => {
                            const on = selected.preset === t.value;
                            return (
                              <button key={t.value}
                                onClick={() => { patchLayer(selected.id, { preset: t.value }); if (t.value !== "none" && t.value !== "custom") { setAnimProp(null); setAnimView("detail"); } replay(); }}
                                className="px-2 py-2.5 rounded-[8px] text-[11px] font-medium border transition-all text-center"
                                style={{ borderColor: on ? "#5cf0a0" : "#333", background: on ? "rgba(92,240,160,0.1)" : "#262626", color: on ? "#c2f0df" : "#aaa" }}>
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#f0a05c" }}>Animasi Keluar</p>
                        <div className="grid grid-cols-2 gap-1.5 mb-4">
                          {OUT_TEMPLATES.map((t) => {
                            const on = (!selected.outPreset && t.value === "none") || selected.outPreset === t.value;
                            return (
                              <button key={t.value}
                                onClick={() => { patchLayer(selected.id, { outPreset: t.value }); if (t.value !== "none" && t.value !== "custom-out") { setAnimProp(null); setAnimView("detail"); } replay(); }}
                                className="px-2 py-2.5 rounded-[8px] text-[11px] font-medium border transition-all text-center"
                                style={{ borderColor: on ? "#f0a05c" : "#333", background: on ? "rgba(240,160,92,0.1)" : "#262626", color: on ? "#ffd0a0" : "#aaa" }}>
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#888" }}>Custom Property</p>
                        {([
                          { section: "Transform", items: [
                            { id: "scale" as AnimProp, label: "Scale", icon: "expand" },
                            { id: "rotate" as AnimProp, label: "Rotate", icon: "rotate" },
                            { id: "move" as AnimProp, label: "Move", icon: "move" },
                          ]},
                          { section: "Style", items: [
                            { id: "opacity" as AnimProp, label: "Opacity", icon: "eye" },
                            { id: "color" as AnimProp, label: "Color", icon: "palette" },
                            { id: "corner-radius" as AnimProp, label: "Corner Radius", icon: "square" },
                            { id: "stroke" as AnimProp, label: "Stroke", icon: "minus" },
                          ]},
                          { section: "Effects", items: [
                            { id: "layer-blur" as AnimProp, label: "Layer Blur", icon: "circle" },
                          ]},
                        ] as { section: string; items: { id: AnimProp; label: string; icon: string }[] }[]).map(({ section, items }) => (
                          <div key={section} className="mb-3">
                            <p className="text-[9px] font-semibold uppercase tracking-wider mb-1 px-1" style={{ color: "#666" }}>{section}</p>
                            {items.map((item) => (
                              <button key={item.id}
                                onClick={() => { setAnimProp(item.id); setAnimView("detail"); if (item.id === "scale") patchLayer(selected.id, { preset: "custom", fromScale: 0.5, fromOpacity: 0 }); else if (item.id === "rotate") patchLayer(selected.id, { preset: "custom", fromRotate: 90, fromOpacity: 0 }); else if (item.id === "move") patchLayer(selected.id, { preset: "custom", fromDX: -80, fromOpacity: 0 }); else if (item.id === "opacity") patchLayer(selected.id, { preset: "fade" }); else if (item.id === "layer-blur") patchLayer(selected.id, { blur: 8 }); replay(); }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-left text-[12px] transition-colors hover:bg-white/5"
                                style={{ color: "#ccc" }}>
                                <Icon name={item.icon as never} size={13} style={{ color: "#8a76ff", flexShrink: 0 }} />
                                {item.label}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── VIEW: detail ── */}
                    {animView === "detail" && (
                      <div className="p-3">
                        <button onClick={() => setAnimView("picker")} className="flex items-center gap-1.5 text-[11px] mb-3 hover:opacity-80" style={{ color: "#888" }}>
                          <Icon name="arrow-left" size={11} /> Kembali
                        </button>
                        <div className="flex items-center gap-2 mb-4">
                          <Icon name="expand" size={14} style={{ color: "#8a76ff" }} />
                          <p className="text-[13px] font-bold" style={{ color: "#e8e8e8" }}>
                            {animProp ? animProp.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Animation"}
                          </p>
                        </div>

                        {/* Entry section */}
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#5cf0a0" }}>Entry</p>
                        <div className="rounded-[10px] p-3 mb-3" style={{ background: "#252525", border: "1px solid #333" }}>
                          <div className="flex items-center justify-between mb-2.5">
                            <label className="text-[11px]" style={{ color: "#aaa" }}>Preset</label>
                            <Select value={selected.preset} onChange={(e) => { patchLayer(selected.id, { preset: e.target.value as AnimPreset }); replay(); }} className="!text-[11px] !py-0.5 !px-2 w-[110px]">
                              {IN_TEMPLATES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </Select>
                          </div>
                          {/* Property-specific from value */}
                          {animProp === "scale" && selected.preset === "custom" && (
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px]" style={{ color: "#aaa" }}>Initial value</span>
                              <div className="flex items-center gap-1.5">
                                <input type="number" step={0.05} value={selected.fromScale ?? 0} onChange={(e) => { patchLayer(selected.id, { fromScale: Number(e.target.value) }); replay(); }} className="w-[64px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                                <span className="text-[10px]" style={{ color: "#666" }}>→ 1.0</span>
                              </div>
                            </div>
                          )}
                          {animProp === "rotate" && selected.preset === "custom" && (
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px]" style={{ color: "#aaa" }}>Initial value</span>
                              <div className="flex items-center gap-1.5">
                                <input type="number" step={15} value={selected.fromRotate ?? 0} onChange={(e) => { patchLayer(selected.id, { fromRotate: Number(e.target.value) }); replay(); }} className="w-[64px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                                <span className="text-[10px]" style={{ color: "#666" }}>°→ 0°</span>
                              </div>
                            </div>
                          )}
                          {animProp === "move" && selected.preset === "custom" && (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px]" style={{ color: "#aaa" }}>From X</span>
                                <input type="number" step={10} value={selected.fromDX ?? 0} onChange={(e) => { patchLayer(selected.id, { fromDX: Number(e.target.value) }); replay(); }} className="w-[72px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                              </div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px]" style={{ color: "#aaa" }}>From Y</span>
                                <input type="number" step={10} value={selected.fromDY ?? 0} onChange={(e) => { patchLayer(selected.id, { fromDY: Number(e.target.value) }); replay(); }} className="w-[72px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                              </div>
                            </>
                          )}
                          {animProp === "opacity" && (
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px]" style={{ color: "#aaa" }}>Initial value</span>
                              <div className="flex items-center gap-1.5">
                                <input type="number" min={0} max={1} step={0.1} value={selected.fromOpacity ?? 0} onChange={(e) => { patchLayer(selected.id, { fromOpacity: Number(e.target.value) }); replay(); }} className="w-[64px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                                <span className="text-[10px]" style={{ color: "#666" }}>→ 1.0</span>
                              </div>
                            </div>
                          )}
                          {animProp === "layer-blur" && (
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px]" style={{ color: "#aaa" }}>Blur amount</span>
                              <div className="flex items-center gap-1.5">
                                <input type="number" min={0} max={40} step={1} value={selected.blur ?? 0} onChange={(e) => patchLayer(selected.id, { blur: Number(e.target.value) })} className="w-[64px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                                <span className="text-[10px]" style={{ color: "#666" }}>px</span>
                              </div>
                            </div>
                          )}
                          {animProp === "corner-radius" && selected.kind === "rect" && (
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px]" style={{ color: "#aaa" }}>To (radius)</span>
                              <input type="number" min={0} max={400} step={4} value={selected.radius ?? 0} onChange={(e) => patchLayer(selected.id, { radius: Number(e.target.value) })} className="w-[72px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                            </div>
                          )}
                          {animProp === "stroke" && (
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px]" style={{ color: "#aaa" }}>Stroke width</span>
                              <input type="number" min={0} max={60} step={1} value={selected.strokeWidth ?? 0} onChange={(e) => patchLayer(selected.id, { strokeWidth: Number(e.target.value) })} className="w-[72px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                            </div>
                          )}
                          <div className="h-px mb-3" style={{ background: "#333" }} />
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#666" }}>Animation</p>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px]" style={{ color: "#aaa" }}>Duration</span>
                            <div className="flex items-center gap-1">
                              <input type="number" min={0.1} step={0.1} value={selected.duration} onChange={(e) => patchLayer(selected.id, { duration: Math.max(0.1, Number(e.target.value)) })} className="w-[56px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                              <span className="text-[10px]" style={{ color: "#666" }}>s</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px]" style={{ color: "#aaa" }}>Delay</span>
                            <div className="flex items-center gap-1">
                              <input type="number" min={0} step={0.1} value={selected.delay} onChange={(e) => patchLayer(selected.id, { delay: Math.max(0, Number(e.target.value)) })} className="w-[56px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                              <span className="text-[10px]" style={{ color: "#666" }}>s</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px]" style={{ color: "#aaa" }}>Easing</span>
                            <Select value={selected.easing} onChange={(e) => { patchLayer(selected.id, { easing: e.target.value as Easing }); replay(); }} className="!text-[11px] !py-0.5 !px-2 w-[110px]">
                              {EASINGS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </Select>
                          </div>
                        </div>

                        {/* Exit section */}
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#f0a05c" }}>Exit</p>
                        <div className="rounded-[10px] p-3 mb-4" style={{ background: "#252525", border: "1px solid #2e2e2e" }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px]" style={{ color: "#aaa" }}>Preset</span>
                            <Select value={selected.outPreset ?? "none"} onChange={(e) => { patchLayer(selected.id, { outPreset: e.target.value as AnimOut }); replay(); }} className="!text-[11px] !py-0.5 !px-2 w-[110px]">
                              {OUT_TEMPLATES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </Select>
                          </div>
                          {selected.outPreset && selected.outPreset !== "none" && (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px]" style={{ color: "#aaa" }}>Duration</span>
                                <div className="flex items-center gap-1">
                                  <input type="number" min={0.1} step={0.1} value={selected.outDuration ?? 0.6} onChange={(e) => patchLayer(selected.id, { outDuration: Math.max(0.1, Number(e.target.value)) })} className="w-[56px] text-right text-[11px] rounded-[5px] border px-1.5 py-0.5" style={{ background: "#1a1a1a", borderColor: "#444", color: "#e8e8e8" }} />
                                  <span className="text-[10px]" style={{ color: "#666" }}>s</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px]" style={{ color: "#aaa" }}>Easing</span>
                                <Select value={selected.outEasing ?? "ease-in"} onChange={(e) => { patchLayer(selected.id, { outEasing: e.target.value as Easing }); replay(); }} className="!text-[11px] !py-0.5 !px-2 w-[110px]">
                                  {EASINGS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </Select>
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => { replay(); setAnimView("list"); }}
                          className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors hover:opacity-90"
                          style={{ background: "rgba(124,111,255,0.15)", color: "#c2b6ff", border: "1px solid rgba(124,111,255,0.3)" }}>
                          ✓ Apply Animation
                        </button>
                      </div>
                    )}
                  </>
                )}

              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <Icon name="shapes" size={24} style={{ color: "#444" }} />
              <p className="mt-3 text-[12px]" style={{ color: "#555" }}>Pilih layer untuk edit propertinya</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Timeline (resizable) ── */}
      <div className="flex-shrink-0 border-t flex flex-col" style={{ background: "#1e1e1e", borderColor: "#333", height: timelineH }}
        onPointerMove={onTlResizeMove} onPointerUp={onTlResizeUp}>
        {/* Drag handle — pull up to expand */}
        <div
          className="w-full flex-shrink-0 flex items-center justify-center hover:bg-[#8a76ff]/20 transition-colors cursor-ns-resize touch-none"
          style={{ height: 8 }}
          onPointerDown={onTlResizeDown}>
          <div className="w-8 h-[3px] rounded-full" style={{ background: "#3a3a3a" }} />
        </div>
        <div className="flex items-center justify-between px-3 py-1 border-b flex-shrink-0" style={{ borderColor: "#333" }}>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#666" }}>Timeline · {project.layers.length} layer</p>
          <div className="flex items-center gap-3 text-[9px]" style={{ color: "#666" }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#5cf0a0" }} /> Masuk</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#f0a05c" }} /> Keluar</span>
          </div>
        </div>

        {project.layers.length === 0 ? (
          <p className="text-[11px] px-3 py-3" style={{ color: "#555" }}>Tambahkan elemen dari panel kiri.</p>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Layer name column */}
            <div className="flex-shrink-0 border-r overflow-y-auto" style={{ width: 160, borderColor: "#333" }}>
              <div className="h-5 border-b" style={{ borderColor: "#333" }} />
              {[...project.layers].reverse().map((l) => (
                <div key={l.id}
                  className="flex items-center gap-1.5 px-2.5 h-8 border-b cursor-pointer"
                  style={{ borderColor: "#2a2a2a", background: selectedId === l.id ? "#2a3d33" : "transparent" }}
                  onClick={() => { setSelectedId(l.id); setPlaying(false); setScrubTime(timeRef.current); }}>
                  <Icon name={layerIcon(l) as never} size={11} style={{ color: selectedId === l.id ? "#7ecfb0" : "#555", flexShrink: 0 }} />
                  <span className="text-[11px] truncate font-medium" style={{ color: selectedId === l.id ? "#c2f0df" : "#999" }}>{layerLabel(l)}</span>
                </div>
              ))}
            </div>

            {/* Tracks + ruler */}
            <div className="relative flex-1 overflow-x-auto">
              {/* Ruler / scrub area */}
              <div ref={timelineRef}
                className="relative h-5 border-b cursor-ew-resize touch-none select-none sticky top-0 z-10"
                style={{ borderColor: "#333", background: "#181818" }}
                onPointerDown={onScrubDown} onPointerMove={onScrubMove} onPointerUp={onScrubUp}>
                {ticks.map((t) => (
                  <div key={t} className="absolute top-0 bottom-0 flex items-end pb-0.5" style={{ left: pct(t) }}>
                    <div className="absolute top-0 w-px h-1.5" style={{ background: "#333" }} />
                    <span className="text-[8px] pl-0.5" style={{ color: "#555" }}>{t}s</span>
                  </div>
                ))}
              </div>

              {/* Track rows */}
              {[...project.layers].reverse().map((l) => {
                const inStart = l.preset === "none" ? 0 : l.delay;
                const inW = l.preset === "none" ? 0 : l.duration;
                const hasOut = !!l.outPreset && l.outPreset !== "none";
                const oStart = layerOutStart(l, project.duration);
                const oDur = l.outDuration ?? 0.6;
                const isSel = selectedId === l.id;
                return (
                  <div key={l.id} className="relative h-8 border-b" style={{ borderColor: "#2a2a2a", background: isSel ? "rgba(42,61,51,0.3)" : "transparent" }}
                    onPointerMove={onBarMove} onPointerUp={onBarUp}
                    onClick={() => setSelectedId(l.id)}>
                    {/* Full lifespan bg */}
                    <div className="absolute top-1/2 -translate-y-1/2 h-3.5 rounded"
                      style={{ left: pct(inStart), width: pct(Math.max(0.001, (hasOut ? oStart + oDur : project.duration) - inStart)), background: "#2a2a2a", border: "1px solid #3a3a3a" }} />
                    {/* Entry bar — body moves it, edges trim its duration */}
                    {l.preset !== "none" && (
                      <div className="absolute top-1/2 -translate-y-1/2 h-3.5 rounded cursor-grab active:cursor-grabbing touch-none"
                        title="Geser untuk delay · tarik tepi untuk durasi"
                        onPointerDown={(e) => onBarDown(e, l, "in", "move")}
                        style={{ left: pct(inStart), width: pct(inW), background: "#5cf0a0", opacity: 0.85 }}>
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize touch-none rounded-l"
                          onPointerDown={(e) => onBarDown(e, l, "in", "start")} style={{ background: "rgba(0,0,0,0.25)" }} />
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize touch-none rounded-r"
                          onPointerDown={(e) => onBarDown(e, l, "in", "end")} style={{ background: "rgba(0,0,0,0.25)" }} />
                      </div>
                    )}
                    {/* Exit bar — body moves it, edges trim its duration */}
                    {hasOut && (
                      <div className="absolute top-1/2 -translate-y-1/2 h-3.5 rounded cursor-grab active:cursor-grabbing touch-none"
                        title="Geser untuk waktu keluar · tarik tepi untuk durasi"
                        onPointerDown={(e) => onBarDown(e, l, "out", "move")}
                        style={{ left: pct(oStart), width: pct(oDur), background: "#f0a05c", opacity: 0.85 }}>
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize touch-none rounded-l"
                          onPointerDown={(e) => onBarDown(e, l, "out", "start")} style={{ background: "rgba(0,0,0,0.25)" }} />
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize touch-none rounded-r"
                          onPointerDown={(e) => onBarDown(e, l, "out", "end")} style={{ background: "rgba(0,0,0,0.25)" }} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Playhead */}
              <div ref={playheadRef} className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: pct(scrubTime), width: 0 }}>
                <div className="w-px h-full" style={{ background: "#e0533c" }} />
                <div className="absolute -top-[1px] -left-[6px] w-[13px] h-[13px] rounded-full pointer-events-auto cursor-ew-resize touch-none"
                  onPointerDown={onScrubDown} onPointerMove={onScrubMove} onPointerUp={onScrubUp}>
                  <div className="absolute top-[3px] left-[3px] w-[7px] h-[7px] rounded-full" style={{ background: "#e0533c" }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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
