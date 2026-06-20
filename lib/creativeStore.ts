import { create } from "zustand";
import { persist } from "zustand/middleware";

// These stores keep base64 media (images/video/uploaded assets) which would
// bloat the shared Supabase JSON blob, so they persist to localStorage only.
// History is capped aggressively to stay within the browser storage quota.

// ─── Generated Images ─────────────────────────────────────────────
export interface GeneratedImage {
  id: string;
  prompt: string;
  size: string;
  quality: string;
  dataUrl: string; // data:image/png;base64,...
  createdAt: number;
}

interface CreativeImageStore {
  images: GeneratedImage[];
  addImages: (imgs: Omit<GeneratedImage, "id" | "createdAt">[]) => void;
  removeImage: (id: string) => void;
  clear: () => void;
}

const IMAGE_CAP = 12;

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
    { name: "creative-images-storage" }
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
    { name: "creative-videos-storage" }
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
  | "bounce";
// Exit / "out" animations — played at the end of a layer's lifespan.
export type AnimOut =
  | "none"
  | "fade-out"
  | "slide-up-out"
  | "slide-down-out"
  | "slide-left-out"
  | "slide-right-out"
  | "pop-out"
  | "rotate-out";
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
    { name: "motion-projects-storage" }
  )
);
