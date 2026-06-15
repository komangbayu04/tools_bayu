import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabaseStorage } from "./supabase";

const cloud = () => createJSONStorage(() => supabaseStorage);

// ─── Prompt Library ───────────────────────────────────────────────
export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  favorite: boolean;
  createdAt: number;
}

interface PromptStore {
  prompts: Prompt[];
  addPrompt: (p: Omit<Prompt, "id" | "createdAt">) => void;
  updatePrompt: (id: string, patch: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;
}

export const usePromptStore = create<PromptStore>()(
  persist(
    (set) => ({
      prompts: [],
      addPrompt: (p) => set((s) => ({ prompts: [{ ...p, id: crypto.randomUUID(), createdAt: Date.now() }, ...s.prompts] })),
      updatePrompt: (id, patch) => set((s) => ({ prompts: s.prompts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deletePrompt: (id) => set((s) => ({ prompts: s.prompts.filter((p) => p.id !== id) })),
    }),
    { name: "ai-prompts-storage", storage: cloud() }
  )
);

// ─── AI Workflow Builder ──────────────────────────────────────────
export interface WorkflowStep {
  id: string;
  title: string;
  tool: string;
  note: string;
}
export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: number;
}

interface WorkflowStore {
  workflows: Workflow[];
  addWorkflow: (w: Omit<Workflow, "id" | "createdAt" | "steps">) => string;
  updateWorkflow: (id: string, patch: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  addStep: (workflowId: string, step: Omit<WorkflowStep, "id">) => void;
  updateStep: (workflowId: string, stepId: string, patch: Partial<WorkflowStep>) => void;
  deleteStep: (workflowId: string, stepId: string) => void;
}

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set) => ({
      workflows: [],
      addWorkflow: (w) => {
        const id = crypto.randomUUID();
        set((s) => ({ workflows: [{ ...w, id, steps: [], createdAt: Date.now() }, ...s.workflows] }));
        return id;
      },
      updateWorkflow: (id, patch) => set((s) => ({ workflows: s.workflows.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      deleteWorkflow: (id) => set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) })),
      addStep: (workflowId, step) => set((s) => ({
        workflows: s.workflows.map((w) =>
          w.id === workflowId ? { ...w, steps: [...w.steps, { ...step, id: crypto.randomUUID() }] } : w
        ),
      })),
      updateStep: (workflowId, stepId, patch) => set((s) => ({
        workflows: s.workflows.map((w) =>
          w.id === workflowId ? { ...w, steps: w.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)) } : w
        ),
      })),
      deleteStep: (workflowId, stepId) => set((s) => ({
        workflows: s.workflows.map((w) =>
          w.id === workflowId ? { ...w, steps: w.steps.filter((st) => st.id !== stepId) } : w
        ),
      })),
    }),
    { name: "ai-workflows-storage", storage: cloud() }
  )
);

// ─── AI Experiments ───────────────────────────────────────────────
export type ExperimentStatus = "idea" | "running" | "success" | "failed";
export interface Experiment {
  id: string;
  title: string;
  model: string;
  prompt: string;
  result: string;
  rating: number; // 0-5
  status: ExperimentStatus;
  createdAt: number;
}

interface ExperimentStore {
  experiments: Experiment[];
  addExperiment: (e: Omit<Experiment, "id" | "createdAt">) => void;
  updateExperiment: (id: string, patch: Partial<Experiment>) => void;
  deleteExperiment: (id: string) => void;
}

export const useExperimentStore = create<ExperimentStore>()(
  persist(
    (set) => ({
      experiments: [],
      addExperiment: (e) => set((s) => ({ experiments: [{ ...e, id: crypto.randomUUID(), createdAt: Date.now() }, ...s.experiments] })),
      updateExperiment: (id, patch) => set((s) => ({ experiments: s.experiments.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteExperiment: (id) => set((s) => ({ experiments: s.experiments.filter((e) => e.id !== id) })),
    }),
    { name: "ai-experiments-storage", storage: cloud() }
  )
);

// ─── AI Assets Library ────────────────────────────────────────────
export type AssetType = "image" | "video" | "text" | "audio";
export interface AiAsset {
  id: string;
  title: string;
  url: string;
  type: AssetType;
  prompt: string;
  model: string;
  tags: string[];
  createdAt: number;
}

interface AssetStore {
  assets: AiAsset[];
  addAsset: (a: Omit<AiAsset, "id" | "createdAt">) => void;
  deleteAsset: (id: string) => void;
}

export const useAssetStore = create<AssetStore>()(
  persist(
    (set) => ({
      assets: [],
      addAsset: (a) => set((s) => ({ assets: [{ ...a, id: crypto.randomUUID(), createdAt: Date.now() }, ...s.assets] })),
      deleteAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
    }),
    { name: "ai-assets-storage", storage: cloud() }
  )
);
