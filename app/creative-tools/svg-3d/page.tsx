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

// ─── Types ────────────────────────────────────────────────────────
type StyleId = "glass" | "metal" | "gold" | "plastic" | "matte" | "iridescent";
type BgId = "transparent" | "dark" | "light" | "studio";
type EnvId = "room" | "neon" | "sunset" | "cold";
type ExportRes = 1 | 2 | 4;

interface MatParams {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  ior: number;
  transmission: number;
  thickness: number;
  envIntensity: number;
  iridescence: number;
}

// Per-style sensible defaults
const STYLE_DEFAULTS: Record<StyleId, MatParams> = {
  glass:      { roughness: 0.04, metalness: 0,    clearcoat: 1,    clearcoatRoughness: 0.08, ior: 1.50, transmission: 1.0, thickness: 1.6, envIntensity: 1.4, iridescence: 0 },
  iridescent: { roughness: 0.18, metalness: 1,    clearcoat: 1,    clearcoatRoughness: 0.12, ior: 1.35, transmission: 0,   thickness: 0,   envIntensity: 1.3, iridescence: 1 },
  metal:      { roughness: 0.22, metalness: 1,    clearcoat: 0,    clearcoatRoughness: 0.1,  ior: 1.5,  transmission: 0,   thickness: 0,   envIntensity: 1.2, iridescence: 0 },
  gold:       { roughness: 0.28, metalness: 1,    clearcoat: 0,    clearcoatRoughness: 0.1,  ior: 1.5,  transmission: 0,   thickness: 0,   envIntensity: 1.25, iridescence: 0 },
  plastic:    { roughness: 0.30, metalness: 0,    clearcoat: 1,    clearcoatRoughness: 0.2,  ior: 1.5,  transmission: 0,   thickness: 0,   envIntensity: 1.0, iridescence: 0 },
  matte:      { roughness: 0.72, metalness: 0,    clearcoat: 0,    clearcoatRoughness: 0.3,  ior: 1.5,  transmission: 0,   thickness: 0,   envIntensity: 0.6, iridescence: 0 },
};

const STYLES: { id: StyleId; label: string; swatch: string }[] = [
  { id: "glass",      label: "Glass",       swatch: "linear-gradient(135deg,#cfe9ff,#9ec5ff)" },
  { id: "iridescent", label: "Holographic", swatch: "linear-gradient(135deg,#ff9bf5,#9bbbff,#9bffd1)" },
  { id: "metal",      label: "Metal",       swatch: "linear-gradient(135deg,#e8eaee,#9aa1ad)" },
  { id: "gold",       label: "Gold",        swatch: "linear-gradient(135deg,#ffe9a8,#d9a84a,#caa14a)" },
  { id: "plastic",    label: "Plastik",     swatch: "linear-gradient(135deg,#7ad1ff,#3b82f6)" },
  { id: "matte",      label: "Matte",       swatch: "linear-gradient(135deg,#8a93a3,#5b6473)" },
];

// ─── Environment presets (light colors + env intensity multiplier) ──
interface EnvPreset { label: string; keyColor: number; keyIntensity: number; rimColor: number; rimIntensity: number; ambientColor: number; ambientIntensity: number; }
const ENV_PRESETS: Record<EnvId, EnvPreset> = {
  room:   { label: "Studio",  keyColor: 0xffffff, keyIntensity: 2.2,  rimColor: 0x88aaff, rimIntensity: 1.2,  ambientColor: 0xffffff, ambientIntensity: 0.4 },
  neon:   { label: "Neon",    keyColor: 0xff44ff, keyIntensity: 2.8,  rimColor: 0x44ffee, rimIntensity: 2.0,  ambientColor: 0x220044, ambientIntensity: 0.6 },
  sunset: { label: "Sunset",  keyColor: 0xff8833, keyIntensity: 3.0,  rimColor: 0x3355ff, rimIntensity: 1.4,  ambientColor: 0xff6622, ambientIntensity: 0.3 },
  cold:   { label: "Arctic",  keyColor: 0xaaddff, keyIntensity: 2.5,  rimColor: 0xffffff, rimIntensity: 0.8,  ambientColor: 0x99ccff, ambientIntensity: 0.5 },
};

const BG_COLORS: Record<Exclude<BgId, "transparent">, number> = {
  dark: 0x14161a, light: 0xf3f4f6, studio: 0x2a2d34,
};

const DEFAULT_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 6 L62 38 L96 38 L68 58 L79 92 L50 72 L21 92 L32 58 L4 38 L38 38 Z" fill="#3b82f6"/></svg>`;

// ─── Material factory (uses matParams overrides) ───────────────────
function makeMaterial(style: StyleId, color: string, p: MatParams): THREE.Material {
  const c = new THREE.Color(color);
  switch (style) {
    case "glass":
      return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: p.roughness,
        transmission: p.transmission,
        thickness: p.thickness,
        ior: p.ior,
        clearcoat: p.clearcoat,
        clearcoatRoughness: p.clearcoatRoughness,
        attenuationColor: c,
        attenuationDistance: p.thickness,
        envMapIntensity: p.envIntensity,
        transparent: true,
        side: THREE.DoubleSide,
      });
    case "iridescent":
      return new THREE.MeshPhysicalMaterial({
        color: c,
        metalness: p.metalness,
        roughness: p.roughness,
        iridescence: p.iridescence,
        iridescenceIOR: p.ior,
        iridescenceThicknessRange: [120, 460],
        clearcoat: p.clearcoat,
        clearcoatRoughness: p.clearcoatRoughness,
        envMapIntensity: p.envIntensity,
      });
    case "metal":
      return new THREE.MeshStandardMaterial({ color: c, metalness: p.metalness, roughness: p.roughness, envMapIntensity: p.envIntensity });
    case "gold":
      return new THREE.MeshStandardMaterial({ color: new THREE.Color("#ffcf6b"), metalness: p.metalness, roughness: p.roughness, envMapIntensity: p.envIntensity });
    case "plastic":
      return new THREE.MeshPhysicalMaterial({ color: c, metalness: 0, roughness: p.roughness, clearcoat: p.clearcoat, clearcoatRoughness: p.clearcoatRoughness, envMapIntensity: p.envIntensity });
    case "matte":
    default:
      return new THREE.MeshStandardMaterial({ color: c, metalness: p.metalness, roughness: p.roughness, envMapIntensity: p.envIntensity });
  }
}

// ─── Page ─────────────────────────────────────────────────────────
export default function Svg3DPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  const three = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    model: THREE.Group | null;
    raf: number;
    keyLight: THREE.DirectionalLight;
    rimLight: THREE.DirectionalLight;
    ambient: THREE.AmbientLight;
  } | null>(null);

  // ── Core settings ──
  const [svg,        setSvg]        = useState<string>(DEFAULT_SVG);
  const [style,      setStyle]      = useState<StyleId>("glass");
  const [color,      setColor]      = useState("#7fb2ff");
  const [depth,      setDepth]      = useState(28);
  const [bevel,      setBevel]      = useState(2);
  const [bevelSegs,  setBevelSegs]  = useState(4);
  const [curveSegs,  setCurveSegs]  = useState(24);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotateSpeed, setRotateSpeed] = useState(2.4);
  const [bg,         setBg]         = useState<BgId>("studio");
  const [error,      setError]      = useState<string | null>(null);

  // ── Material params (start from style defaults) ──
  const [matP, setMatP] = useState<MatParams>(STYLE_DEFAULTS.glass);

  // ── Lighting & environment ──
  const [env,          setEnv]          = useState<EnvId>("room");
  const [keyIntensity, setKeyIntensity] = useState(2.2);
  const [rimIntensity, setRimIntensity] = useState(1.2);
  const [exposure,     setExposure]     = useState(1.1);

  // ── Export ──
  const [exportRes, setExportRes] = useState<ExportRes>(2);

  // ── Advanced panel open ──
  const [showAdvanced, setShowAdvanced] = useState(false);

  // helper: update a single mat param
  const setMP = useCallback(<K extends keyof MatParams>(k: K, v: MatParams[K]) => {
    setMatP(prev => ({ ...prev, [k]: v }));
  }, []);

  // When style changes → reset mat params to defaults
  const applyStyle = useCallback((s: StyleId) => {
    setStyle(s);
    setMatP(STYLE_DEFAULTS[s]);
  }, []);

  // ── Build / rebuild extruded model ──
  const rebuild = useCallback(() => {
    const ctx = three.current;
    if (!ctx) return;
    setError(null);

    if (ctx.model) {
      ctx.scene.remove(ctx.model);
      ctx.model.traverse((o) => {
        if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); }
      });
      ctx.model = null;
    }

    let data;
    try { data = new SVGLoader().parse(svg); }
    catch { setError("SVG tidak valid. Pastikan isinya markup <svg> yang benar."); return; }

    const material = makeMaterial(style, color, matP);
    const inner = new THREE.Group();
    let shapeCount = 0;

    for (const path of data.paths) {
      const shapes = SVGLoader.createShapes(path);
      for (const shape of shapes) {
        const geom = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: bevel > 0,
          bevelThickness: bevel,
          bevelSize: bevel * 0.8,
          bevelSegments: bevelSegs,
          curveSegments: curveSegs,
        });
        inner.add(new THREE.Mesh(geom, material));
        shapeCount++;
      }
    }

    if (shapeCount === 0) { setError("Tidak ada bentuk yang bisa diekstrusi dari SVG ini."); return; }

    inner.scale.y = -1;
    inner.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(inner);
    const center = new THREE.Vector3();
    const size   = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    inner.position.sub(center);

    const outer = new THREE.Group();
    outer.add(inner);
    outer.scale.setScalar(4 / (Math.max(size.x, size.y, size.z) || 1));

    ctx.scene.add(outer);
    ctx.model = outer;
  }, [svg, style, color, depth, bevel, bevelSegs, curveSegs, matP]);

  // ── One-time scene setup ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth, h = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x88aaff, 1.2);
    rimLight.position.set(-6, -2, -4);
    scene.add(rimLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 9);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotateSpeed = 2.4;

    three.current = { renderer, scene, camera, controls, model: null, raf: 0, keyLight, rimLight, ambient };

    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      three.current!.raf = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      const nw = mount.clientWidth, nh = mount.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    rebuild();

    return () => {
      ro.disconnect();
      cancelAnimationFrame(three.current?.raf ?? 0);
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.parentNode?.removeChild(renderer.domElement);
      three.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { rebuild(); }, [rebuild]);

  useEffect(() => {
    if (three.current) three.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    if (three.current) three.current.controls.autoRotateSpeed = rotateSpeed;
  }, [rotateSpeed]);

  useEffect(() => {
    if (!three.current) return;
    const ctx = three.current;
    if (bg === "transparent") { ctx.scene.background = null; ctx.renderer.setClearAlpha(0); }
    else { ctx.scene.background = new THREE.Color(BG_COLORS[bg]); ctx.renderer.setClearAlpha(1); }
  }, [bg]);

  // Apply environment preset
  useEffect(() => {
    const ctx = three.current;
    if (!ctx) return;
    const preset = ENV_PRESETS[env];
    ctx.keyLight.color.set(preset.keyColor);
    ctx.keyLight.intensity = preset.keyIntensity * (keyIntensity / ENV_PRESETS[env].keyIntensity);
    ctx.rimLight.color.set(preset.rimColor);
    ctx.rimLight.intensity = preset.rimIntensity * (rimIntensity / ENV_PRESETS[env].rimIntensity);
    ctx.ambient.color.set(preset.ambientColor);
    ctx.ambient.intensity = preset.ambientIntensity;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env]);

  // Update key light intensity independently
  useEffect(() => {
    if (three.current) three.current.keyLight.intensity = keyIntensity;
  }, [keyIntensity]);

  useEffect(() => {
    if (three.current) three.current.rimLight.intensity = rimIntensity;
  }, [rimIntensity]);

  useEffect(() => {
    if (three.current) three.current.renderer.toneMappingExposure = exposure;
  }, [exposure]);

  // ── File upload ──
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") { setError("File harus berformat .svg"); return; }
    const reader = new FileReader();
    reader.onload = () => setSvg(String(reader.result));
    reader.readAsText(file);
  };

  // ── Export PNG (high-res) ──
  const exportPng = () => {
    const ctx = three.current;
    if (!ctx) return;
    const prevPR = ctx.renderer.getPixelRatio();
    ctx.renderer.setPixelRatio(prevPR * exportRes);
    ctx.renderer.setSize(mountRef.current!.clientWidth, mountRef.current!.clientHeight);
    ctx.renderer.render(ctx.scene, ctx.camera);
    const url = ctx.renderer.domElement.toDataURL("image/png");
    ctx.renderer.setPixelRatio(prevPR);
    ctx.renderer.setSize(mountRef.current!.clientWidth, mountRef.current!.clientHeight);
    const a = document.createElement("a");
    a.href = url;
    a.download = `svg-3d-${style}-${exportRes}x.png`;
    a.click();
  };

  // ── UI helpers ──
  const S = (label: string, value: number, set: (n: number) => void, min: number, max: number, step = 0.01, suffix = "") => (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-medium" style={{ color: "var(--color-muted)" }}>{label}</span>
        <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: "var(--color-ink)" }}>{value.toFixed(step < 1 ? 2 : 0)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-[var(--color-primary)]" />
    </div>
  );

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl p-4 border flex flex-col gap-3.5" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>{title}</p>
      {children}
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
              background: "repeating-conic-gradient(var(--color-canvas) 0% 25%, var(--color-surface) 0% 50%) 50% / 26px 26px",
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
            <Button variant="outline" onClick={() => setAutoRotate(v => !v)}>
              <Icon name={autoRotate ? "pause" : "play"} size={14} /> {autoRotate ? "Stop rotasi" : "Putar"}
            </Button>
            <div className="flex items-center gap-1 ml-auto">
              {([1, 2, 4] as ExportRes[]).map(r => (
                <button key={r} onClick={() => setExportRes(r)}
                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all"
                  style={{
                    borderColor: exportRes === r ? "var(--color-primary)" : "var(--color-hairline)",
                    background: exportRes === r ? "var(--color-primary)" : "var(--color-surface)",
                    color: exportRes === r ? "var(--color-on-primary)" : "var(--color-muted)",
                  }}>{r}x</button>
              ))}
              <Button variant="outline" onClick={exportPng}><Icon name="download" size={14} /> Export PNG</Button>
            </div>
          </div>
        </div>

        {/* ── Adjustment panel ── */}
        <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>

          {/* Style presets */}
          <SectionCard title="Gaya Material">
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button key={s.id} onClick={() => applyStyle(s.id)}
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
          </SectionCard>

          {/* Shape */}
          <SectionCard title="Bentuk">
            {S("Ketebalan (depth)", depth, setDepth, 2, 80, 1)}
            {S("Bevel (lengkung tepi)", bevel, setBevel, 0, 12, 0.5)}
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium" style={{ color: "var(--color-muted)" }}>Warna</span>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-10 h-8 rounded-md cursor-pointer border" style={{ borderColor: "var(--color-hairline)" }} />
            </div>
          </SectionCard>

          {/* Background */}
          <SectionCard title="Latar">
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
          </SectionCard>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center justify-between w-full rounded-xl px-4 py-3 border text-left transition-all"
            style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}>
            <span className="text-[12px] font-bold" style={{ color: "var(--color-ink)" }}>
              ⚙️  Advanced Controls
            </span>
            <Icon name={showAdvanced ? "chevron-down" : "chevron-right"} size={13} style={{ color: "var(--color-muted)" }} />
          </button>

          {showAdvanced && (
            <>
              {/* Material fine-tuning */}
              <SectionCard title="Material Detail">
                {S("Roughness (kasar↔halus)", matP.roughness, v => setMP("roughness", v), 0, 1)}
                {S("Metalness", matP.metalness, v => setMP("metalness", v), 0, 1)}
                {S("Clearcoat (lapisan clear)", matP.clearcoat, v => setMP("clearcoat", v), 0, 1)}
                {S("Clearcoat Roughness", matP.clearcoatRoughness, v => setMP("clearcoatRoughness", v), 0, 1)}
                {S("Env Map Intensity", matP.envIntensity, v => setMP("envIntensity", v), 0, 3)}
                {(style === "glass") && (<>
                  {S("Transmission (transparansi)", matP.transmission, v => setMP("transmission", v), 0, 1)}
                  {S("IOR (pembiasan cahaya)", matP.ior, v => setMP("ior", v), 1, 2.5, 0.01)}
                  {S("Thickness (ketebalan kaca)", matP.thickness, v => setMP("thickness", v), 0.1, 5, 0.1)}
                </>)}
                {(style === "iridescent") && (
                  S("Iridescence (efek pelangi)", matP.iridescence, v => setMP("iridescence", v), 0, 1)
                )}
              </SectionCard>

              {/* Geometry quality */}
              <SectionCard title="Kualitas Geometri">
                {S("Curve Segments (kelancaran kurva)", curveSegs, setCurveSegs, 4, 64, 1, "")}
                {S("Bevel Segments (kelancaran bevel)", bevelSegs, setBevelSegs, 1, 12, 1, "")}
                <p className="text-[10.5px] leading-snug" style={{ color: "var(--color-muted-soft)" }}>
                  Nilai lebih tinggi = lebih halus tapi lebih berat. Direkomendasikan 24 / 4.
                </p>
              </SectionCard>

              {/* Environment & lighting */}
              <SectionCard title="Environment">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(ENV_PRESETS) as [EnvId, EnvPreset][]).map(([id, p]) => (
                    <button key={id} onClick={() => {
                      setEnv(id);
                      setKeyIntensity(p.keyIntensity);
                      setRimIntensity(p.rimIntensity);
                    }}
                      className="py-2 rounded-xl border text-[11.5px] font-semibold transition-all"
                      style={{
                        borderColor: env === id ? "var(--color-primary)" : "var(--color-hairline)",
                        background: env === id ? "var(--color-primary-light)" : "var(--color-surface)",
                        color: env === id ? "var(--color-primary-ink)" : "var(--color-muted)",
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Pencahayaan">
                {S("Key Light (cahaya utama)", keyIntensity, setKeyIntensity, 0, 6, 0.1)}
                {S("Rim Light (cahaya tepi)", rimIntensity, setRimIntensity, 0, 4, 0.1)}
                {S("Exposure (kecerahan global)", exposure, setExposure, 0.3, 3, 0.05)}
                {S("Kecepatan rotasi", rotateSpeed, setRotateSpeed, 0.5, 10, 0.1)}
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </ShellLayout>
  );
}
