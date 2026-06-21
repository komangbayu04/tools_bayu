import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabaseStorage } from "./supabase";

// All creative stores persist to Supabase (same cloud adapter as the rest of
// the app). Heavy media (images/videos/uploaded assets) is uploaded to Supabase
// Storage and only its URL is kept here, so the cloud JSON blob stays small.
const cloud = () => createJSONStorage(() => supabaseStorage);

// ─── Generated Images ─────────────────────────────────────────────
export interface GeneratedImage {
  id: string;
  prompt: string;
  size: string;
  quality: string;
  dataUrl: string; // Supabase Storage public URL (or a data URL as fallback)
  createdAt: number;
}

interface CreativeImageStore {
  images: GeneratedImage[];
  addImages: (imgs: Omit<GeneratedImage, "id" | "createdAt">[]) => void;
  removeImage: (id: string) => void;
  clear: () => void;
}

const IMAGE_CAP = 60;

export const useCreativeImageStore = create<CreativeImageStore>()(
  persist(
    (set) => ({
      images: [],
      addImages: (imgs) =>
        set((s) => ({
          images: [
            ...imgs.map((i) => ({ ...i, id: crypto.randomUUID(), createdAt: Date.now() })),
            ...s.images,
          ].slice(0, IMAGE_CAP),
        })),
      removeImage: (id) => set((s) => ({ images: s.images.filter((i) => i.id !== id) })),
      clear: () => set({ images: [] }),
    }),
    { name: "creative-images-storage", storage: cloud() }
  )
);

// ─── Generated Videos ─────────────────────────────────────────────
export type VideoStatus = "queued" | "in_progress" | "completed" | "failed";

export interface GeneratedVideo {
  id: string;
  videoId: string; // OpenAI job id
  prompt: string;
  model: string;
  seconds: string;
  size: string;
  status: VideoStatus;
  dataUrl?: string; // data:video/mp4;base64,... once completed
  error?: string;
  createdAt: number;
}

interface CreativeVideoStore {
  videos: GeneratedVideo[];
  addVideo: (v: Omit<GeneratedVideo, "id" | "createdAt">) => string;
  updateVideo: (id: string, patch: Partial<GeneratedVideo>) => void;
  removeVideo: (id: string) => void;
}

const VIDEO_CAP = 6;

export const useCreativeVideoStore = create<CreativeVideoStore>()(
  persist(
    (set) => ({
      videos: [],
      addVideo: (v) => {
        const id = crypto.randomUUID();
        set((s) => ({ videos: [{ ...v, id, createdAt: Date.now() }, ...s.videos].slice(0, VIDEO_CAP) }));
        return id;
      },
      updateVideo: (id, patch) =>
        set((s) => ({ videos: s.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
      removeVideo: (id) => set((s) => ({ videos: s.videos.filter((v) => v.id !== id) })),
    }),
    { name: "creative-videos-storage", storage: cloud() }
  )
);

// ─── Motion Editor projects ───────────────────────────────────────
export type LayerKind = "text" | "rect" | "circle" | "image";
export type AnimPreset =
  | "none"
  | "fade"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "pop"
  | "rotate"
  | "bounce"
  | "custom"; // manual: animate FROM the from* offsets to the resting state
// Exit / "out" animations — played at the end of a layer's lifespan.
export type AnimOut =
  | "none"
  | "fade-out"
  | "slide-up-out"
  | "slide-down-out"
  | "slide-left-out"
  | "slide-right-out"
  | "pop-out"
  | "rotate-out"
  | "custom-out"; // manual: animate TO the to* offsets
export type Easing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface MotionLayer {
  id: string;
  kind: LayerKind;
  // geometry (canvas units, 1080-based stage)
  x: number;
  y: number;
  w: number;
  h: number;
  // content / style
  text?: string;
  fontSize?: number;
  color: string;
  radius?: number; // corner radius for rect
  src?: string; // data url for images
  // entry ("in") animation
  preset: AnimPreset;
  duration: number; // seconds — entry duration
  delay: number; // seconds — when the entry begins
  easing: Easing;
  // exit ("out") animation — all optional so older projects keep working
  outPreset?: AnimOut;
  outDuration?: number; // seconds — exit duration
  outStart?: number; // seconds — when the exit begins (defaults to end - outDuration)
  outEasing?: Easing;
  // manual ("custom") entry transform — where the layer animates FROM
  fromDX?: number; fromDY?: number; fromScale?: number; fromRotate?: number; fromOpacity?: number;
  // manual ("custom") exit transform — where the layer animates TO
  toDX?: number; toDY?: number; toScale?: number; toRotate?: number; toOpacity?: number;
  // outline / stroke (rect + circle)
  strokeColor?: string;
  strokeWidth?: number; // px, 0 = none
  // static visual effects (canvas filters) applied to the whole layer
  blur?: number;       // px
  grayscale?: number;  // 0..1
  sepia?: number;      // 0..1
  saturate?: number;   // 1 = normal, >1 boosts
  brightness?: number; // 1 = normal
  contrast?: number;   // 1 = normal
}

export type CanvasRatio = "1:1" | "16:9" | "9:16";

export interface MotionProject {
  id: string;
  name: string;
  ratio: CanvasRatio;
  bg: string;
  duration: number; // total seconds
  layers: MotionLayer[];
  createdAt: number;
  updatedAt: number;
}

interface MotionStore {
  projects: MotionProject[];
  addProject: (p: Omit<MotionProject, "id" | "createdAt" | "updatedAt">) => string;
  updateProject: (id: string, patch: Partial<MotionProject>) => void;
  deleteProject: (id: string) => void;
}

export const useMotionStore = create<MotionStore>()(
  persist(
    (set) => ({
      projects: [],
      addProject: (p) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        set((s) => ({ projects: [{ ...p, id, createdAt: now, updatedAt: now }, ...s.projects] }));
        return id;
      },
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
        })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
    }),
    { name: "motion-projects-storage", storage: cloud() }
  )
);
