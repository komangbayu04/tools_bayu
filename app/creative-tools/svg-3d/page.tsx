"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

// ─── Material style presets ───────────────────────────────────────
type StyleId = "glass" | "metal" | "gold" | "plastic" | "matte" | "iridescent";

const STYLES: { id: StyleId; label: string; swatch: string }[] = [
  { id: "glass", label: "Glass", swatch: "linear-gradient(135deg,#cfe9ff,#9ec5ff)" },
  { id: "iridescent", label: "Holographic", swatch: "linear-gradient(135deg,#ff9bf5,#9bbbff,#9bffd1)" },
  { id: "metal", label: "Metal", swatch: "linear-gradient(135deg,#e8eaee,#9aa1ad)" },
  { id: "gold", label: "Gold", swatch: "linear-gradient(135deg,#ffe9a8,#d9a84a,#caa14a)" },
  { id: "plastic", label: "Plastik", swatch: "linear-gradient(135deg,#7ad1ff,#3b82f6)" },
  { id: "matte", label: "Matte", swatch: "linear-gradient(135deg,#8a93a3,#5b6473)" },
];

function makeMaterial(style: StyleId, color: string): THREE.Material {
  const c = new THREE.Color(color);
  switch (style) {
    case "glass":
      return new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.04,
        transmission: 1, thickness: 1.6, ior: 1.5,
        clearcoat: 1, clearcoatRoughness: 0.08,
        attenuationColor: c, attenuationDistance: 1.6,
        envMapIntensity: 1.4, transparent: true, side: THREE.DoubleSide,
      });
    case "iridescent":
      return new THREE.MeshPhysicalMaterial({
        color: c, metalness: 1, roughness: 0.18,
        iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [120, 460],
        clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.3,
      });
    case "metal":
      return new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: 0.22, envMapIntensity: 1.2 });
    case "gold":
      return new THREE.MeshStandardMaterial({ color: new THREE.Color("#ffcf6b"), metalness: 1, roughness: 0.28, envMapIntensity: 1.25 });
    case "plastic":
      return new THREE.MeshPhysicalMaterial({ color: c, metalness: 0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2, envMapIntensity: 1 });
    case "matte":
    default:
      return new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: 0.72, envMapIntensity: 0.6 });
  }
}

// ─── Background presets ───────────────────────────────────────────
type BgId = "transparent" | "dark" | "light" | "studio";
const BG_COLORS: Record<Exclude<BgId, "transparent">, number> = {
  dark: 0x14161a, light: 0xf3f4f6, studio: 0x2a2d34,
};

// A friendly default so the canvas isn't empty on first load: a rounded star.
const DEFAULT_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 6 L62 38 L96 38 L68 58 L79 92 L50 72 L21 92 L32 58 L4 38 L38 38 Z" fill="#3b82f6"/></svg>`;

export default function Svg3DPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // three.js singletons
  const three = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
    controls: OrbitControls; model: THREE.Group | null; raf: number;
  } | null>(null);

  // Settings
  const [svg, setSvg] = useState<string>(DEFAULT_SVG);
  const [style, setStyle] = useState<StyleId>("glass");
  const [color, setColor] = useState("#7fb2ff");
  const [depth, setDepth] = useState(28);
  const [bevel, setBevel] = useState(2);
  const [autoRotate, setAutoRotate] = useState(true);
  const [bg, setBg] = useState<BgId>("studio");
  const [error, setError] = useState<string | null>(null);

  // ── Build / rebuild the extruded model from current settings ──
  const rebuild = useCallback(() => {
    const ctx = three.current;
    if (!ctx) return;
    setError(null);

    // Dispose old model
    if (ctx.model) {
      ctx.scene.remove(ctx.model);
      ctx.model.traverse((o) => {
        if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); }
      });
      ctx.model = null;
    }

    let data;
    try {
      data = new SVGLoader().parse(svg);
    } catch {
      setError("SVG tidak valid. Pastikan isinya markup <svg> yang benar.");
      return;
    }

    const material = makeMaterial(style, color);
    const inner = new THREE.Group();
    let shapeCount = 0;

    for (const path of data.paths) {
      const shapes = SVGLoader.createShapes(path);
      for (const shape of shapes) {
        const geom = new THREE.ExtrudeGeometry(shape, {
          depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8,
          bevelSegments: 3, curveSegments: 24,
        });
        const mesh = new THREE.Mesh(geom, material);
        inner.add(mesh);
        shapeCount++;
      }
    }

    if (shapeCount === 0) {
      setError("Tidak ada bentuk yang bisa diekstrusi dari SVG ini.");
      return;
    }

    // SVG uses a Y-down coordinate system → flip vertically.
    inner.scale.y = -1;
    inner.updateMatrixWorld(true);

    // Center + scale to fit a consistent viewport size.
    const box = new THREE.Box3().setFromObject(inner);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    inner.position.sub(center);

    const outer = new THREE.Group();
    outer.add(inner);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    outer.scale.setScalar(4 / maxDim);

    ctx.scene.add(outer);
    ctx.model = outer;
  }, [svg, style, color, depth, bevel]);

  // ── One-time scene setup ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Image-based lighting — essential for glass/metal to look real.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // A couple of direct lights for crisp highlights.
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 1.2);
    rim.position.set(-6, -2, -4);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 9);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotateSpeed = 2.4;

    three.current = { renderer, scene, camera, controls, model: null, raf: 0 };

    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      three.current!.raf = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // Build the initial model now that the scene exists.
    rebuild();

    return () => {
      ro.disconnect();
      cancelAnimationFrame(three.current?.raf ?? 0);
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      three.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild model whenever the geometry/material settings change.
  useEffect(() => { rebuild(); }, [rebuild]);

  // Auto-rotate toggle.
  useEffect(() => {
    if (three.current) three.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  // Background.
  useEffect(() => {
    const ctx = three.current;
    if (!ctx) return;
    if (bg === "transparent") {
      ctx.scene.background = null;
      ctx.renderer.setClearAlpha(0);
    } else {
      ctx.scene.background = new THREE.Color(BG_COLORS[bg]);
      ctx.renderer.setClearAlpha(1);
    }
  }, [bg]);

  // ── File upload ──
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") {
      setError("File harus berformat .svg");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSvg(String(reader.result));
    reader.readAsText(file);
  };

  // ── Export current view to PNG ──
  const exportPng = () => {
    const ctx = three.current;
    if (!ctx) return;
    ctx.renderer.render(ctx.scene, ctx.camera);
    const url = ctx.renderer.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `svg-3d-${style}.png`;
    a.click();
  };

  // ── UI helpers ──
  const sliderRow = (label: string, value: number, set: (n: number) => void, min: number, max: number, step = 1, suffix = "") => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>{label}</span>
        <span className="text-[12px] font-semibold" style={{ color: "var(--color-ink)" }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-[var(--color-primary)]" />
    </div>
  );

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="Creative Tools"
        title="SVG to 3D"
        subtitle="Ubah logo atau ikon SVG menjadi objek 3D — efek glass, metal, gold & lainnya."
        actions={
          <Link href="/creative-tools">
            <Button variant="outline"><Icon name="arrow-left" size={14} /> Creative Tools</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* ── 3D Canvas ── */}
        <div className="flex flex-col gap-3">
          <div
            className="relative rounded-2xl overflow-hidden border"
            style={{
              borderColor: "var(--color-hairline)",
              height: "min(64vh, 580px)",
              background:
                "repeating-conic-gradient(var(--color-canvas) 0% 25%, var(--color-surface) 0% 50%) 50% / 26px 26px",
            }}
          >
            <div ref={mountRef} className="absolute inset-0" />
            {error && (
              <div className="absolute bottom-3 left-3 right-3 flex items-start gap-2 text-[12.5px] rounded-lg px-3 py-2"
                style={{ background: "rgba(216,90,74,0.92)", color: "#fff" }}>
                <Icon name="alert-triangle" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}
            <div className="absolute top-3 left-3 text-[11px] px-2.5 py-1 rounded-full pointer-events-none"
              style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}>
              Drag untuk memutar · scroll untuk zoom
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".svg,image/svg+xml" onChange={onFile} className="hidden" />
            <Button onClick={() => fileRef.current?.click()}><Icon name="upload" size={14} /> Upload SVG</Button>
            <Button variant="outline" onClick={() => setAutoRotate((v) => !v)}>
              <Icon name={autoRotate ? "pause" : "play"} size={14} /> {autoRotate ? "Stop rotasi" : "Putar"}
            </Button>
            <Button variant="outline" onClick={exportPng}><Icon name="download" size={14} /> Export PNG</Button>
          </div>
        </div>

        {/* ── Adjustment panel ── */}
        <div className="flex flex-col gap-5">
          {/* Style */}
          <div className="rounded-2xl p-4 border" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted-soft)" }}>Gaya Material</p>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button key={s.id} onClick={() => setStyle(s.id)}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all"
                  style={{
                    borderColor: style === s.id ? "var(--color-primary)" : "var(--color-hairline)",
                    background: style === s.id ? "var(--color-primary-light)" : "var(--color-surface)",
                  }}>
                  <span className="w-full h-8 rounded-lg" style={{ background: s.swatch }} />
                  <span className="text-[11px] font-semibold" style={{ color: style === s.id ? "var(--color-primary-ink)" : "var(--color-muted)" }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shape adjustments */}
          <div className="rounded-2xl p-4 border flex flex-col gap-4" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Bentuk</p>
            {sliderRow("Ketebalan (depth)", depth, setDepth, 2, 80)}
            {sliderRow("Bevel (lengkung tepi)", bevel, setBevel, 0, 8)}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Warna</span>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-10 h-8 rounded-md cursor-pointer border" style={{ borderColor: "var(--color-hairline)" }} />
            </div>
            <p className="text-[10.5px] leading-snug" style={{ color: "var(--color-muted-soft)" }}>
              Pada Glass, warna jadi tint transparan. Pada Gold, warna mengikuti emas.
            </p>
          </div>

          {/* Background */}
          <div className="rounded-2xl p-4 border" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted-soft)" }}>Latar</p>
            <div className="grid grid-cols-4 gap-2">
              {(["transparent", "studio", "dark", "light"] as BgId[]).map((b) => (
                <button key={b} onClick={() => setBg(b)}
                  className="text-[11px] font-semibold py-2 rounded-lg border capitalize transition-all"
                  style={{
                    borderColor: bg === b ? "var(--color-primary)" : "var(--color-hairline)",
                    background: bg === b ? "var(--color-primary-light)" : "var(--color-surface)",
                    color: bg === b ? "var(--color-primary-ink)" : "var(--color-muted)",
                  }}>
                  {b === "transparent" ? "Transp" : b === "studio" ? "Studio" : b === "dark" ? "Gelap" : "Terang"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}
