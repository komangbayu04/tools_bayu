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
  prompt: string;    // actual GPT prompt for this step, can use {{input}}
  note: string;      // optional description shown in UI
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

export interface WorkflowRunStep {
  stepId: string;
  title: string;
  output: string;
  status: "pending" | "running" | "done" | "error";
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  userInput: string;
  steps: WorkflowRunStep[];
  createdAt: number;
}

interface WorkflowRunStore {
  runs: WorkflowRun[];
  addRun: (run: Omit<WorkflowRun, "id" | "createdAt">) => string;
  deleteRun: (id: string) => void;
}

export const useWorkflowRunStore = create<WorkflowRunStore>()(
  persist(
    (set) => ({
      runs: [],
      addRun: (run) => {
        const id = crypto.randomUUID();
        set((s) => ({ runs: [{ ...run, id, createdAt: Date.now() }, ...s.runs] }));
        return id;
      },
      deleteRun: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
    }),
    { name: "ai-workflow-runs-storage", storage: cloud() }
  )
);

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

// ─── Sitemap Generator ────────────────────────────────────────────
export interface SitemapSection {
  id: string;
  name: string;
  description: string;
}
export interface SitemapPage {
  id: string;
  name: string;
  sections: SitemapSection[];
}
export interface Sitemap {
  id: string;
  name: string;
  pages: SitemapPage[];
  createdAt: number;
}

const sId = () => crypto.randomUUID();

interface SitemapStore {
  sitemaps: Sitemap[];
  addSitemap: (name: string, pages: SitemapPage[]) => string;
  renameSitemap: (id: string, name: string) => void;
  deleteSitemap: (id: string) => void;
  addPage: (sitemapId: string, name: string) => void;
  renamePage: (sitemapId: string, pageId: string, name: string) => void;
  deletePage: (sitemapId: string, pageId: string) => void;
  addSection: (sitemapId: string, pageId: string, name: string, description?: string) => void;
  updateSection: (sitemapId: string, pageId: string, sectionId: string, patch: Partial<Pick<SitemapSection, "name" | "description">>) => void;
  deleteSection: (sitemapId: string, pageId: string, sectionId: string) => void;
  moveSection: (sitemapId: string, pageId: string, sectionId: string, dir: -1 | 1) => void;
}

// Map over a sitemap's pages, then over a page's sections — keeps the
// nested updaters below short and readable.
const mapPages = (sm: Sitemap, sitemapId: string, fn: (p: SitemapPage[]) => SitemapPage[]) =>
  sm.id === sitemapId ? { ...sm, pages: fn(sm.pages) } : sm;

export const useSitemapStore = create<SitemapStore>()(
  persist(
    (set) => ({
      sitemaps: [],
      addSitemap: (name, pages) => {
        const id = sId();
        set((s) => ({ sitemaps: [{ id, name, pages, createdAt: Date.now() }, ...s.sitemaps] }));
        return id;
      },
      renameSitemap: (id, name) =>
        set((s) => ({ sitemaps: s.sitemaps.map((sm) => (sm.id === id ? { ...sm, name } : sm)) })),
      deleteSitemap: (id) => set((s) => ({ sitemaps: s.sitemaps.filter((sm) => sm.id !== id) })),

      addPage: (sitemapId, name) =>
        set((s) => ({
          sitemaps: s.sitemaps.map((sm) =>
            mapPages(sm, sitemapId, (pages) => [...pages, { id: sId(), name, sections: [] }])
          ),
        })),
      renamePage: (sitemapId, pageId, name) =>
        set((s) => ({
          sitemaps: s.sitemaps.map((sm) =>
            mapPages(sm, sitemapId, (pages) => pages.map((p) => (p.id === pageId ? { ...p, name } : p)))
          ),
        })),
      deletePage: (sitemapId, pageId) =>
        set((s) => ({
          sitemaps: s.sitemaps.map((sm) =>
            mapPages(sm, sitemapId, (pages) => pages.filter((p) => p.id !== pageId))
          ),
        })),

      addSection: (sitemapId, pageId, name, description = "") =>
        set((s) => ({
          sitemaps: s.sitemaps.map((sm) =>
            mapPages(sm, sitemapId, (pages) =>
              pages.map((p) =>
                p.id === pageId ? { ...p, sections: [...p.sections, { id: sId(), name, description }] } : p
              )
            )
          ),
        })),
      updateSection: (sitemapId, pageId, sectionId, patch) =>
        set((s) => ({
          sitemaps: s.sitemaps.map((sm) =>
            mapPages(sm, sitemapId, (pages) =>
              pages.map((p) =>
                p.id === pageId
                  ? { ...p, sections: p.sections.map((sec) => (sec.id === sectionId ? { ...sec, ...patch } : sec)) }
                  : p
              )
            )
          ),
        })),
      deleteSection: (sitemapId, pageId, sectionId) =>
        set((s) => ({
          sitemaps: s.sitemaps.map((sm) =>
            mapPages(sm, sitemapId, (pages) =>
              pages.map((p) =>
                p.id === pageId ? { ...p, sections: p.sections.filter((sec) => sec.id !== sectionId) } : p
              )
            )
          ),
        })),
      moveSection: (sitemapId, pageId, sectionId, dir) =>
        set((s) => ({
          sitemaps: s.sitemaps.map((sm) =>
            mapPages(sm, sitemapId, (pages) =>
              pages.map((p) => {
                if (p.id !== pageId) return p;
                const idx = p.sections.findIndex((sec) => sec.id === sectionId);
                const next = idx + dir;
                if (idx < 0 || next < 0 || next >= p.sections.length) return p;
                const sections = [...p.sections];
                [sections[idx], sections[next]] = [sections[next], sections[idx]];
                return { ...p, sections };
              })
            )
          ),
        })),
    }),
    { name: "ai-sitemaps-storage", storage: cloud() }
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
