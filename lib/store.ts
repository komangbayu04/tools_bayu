import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { supabaseStorage } from "./supabase"

const cloud = () => createJSONStorage(() => supabaseStorage)

// ─── Task store ───────────────────────────────────────────────────
export type Priority = "high" | "medium" | "low"
export type TaskStatus = "todo" | "in_progress" | "done"

export interface Task {
  id: string
  title: string
  description?: string
  projectId: string
  priority: Priority
  status: TaskStatus
  deadline?: string        // ISO date "2026-06-20"
  due?: string             // legacy short label, kept for compatibility
  source: "manual" | "transcript"
  order: number
  hours?: number
  invoiceLinked?: boolean
  createdAt: number
}

interface TaskStore {
  tasks: Task[]
  addTask: (task: Omit<Task, "id" | "order" | "createdAt"> & { createdAt?: number }) => void
  toggleDone: (id: string) => void
  setStatus: (id: string, status: TaskStatus) => void
  deleteTask: (id: string) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  reorderTasks: (priority: Priority, activeId: string, overId: string) => void
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (task) => set((s) => ({
        tasks: [...s.tasks, { ...task, id: crypto.randomUUID(), order: s.tasks.filter(t => t.priority === task.priority).length, createdAt: task.createdAt ?? Date.now() }]
      })),
      toggleDone: (id) => set((s) => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t) })),
      setStatus: (id, status) => set((s) => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status } : t) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) })),
      updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) })),
      reorderTasks: (priority, activeId, overId) => set((s) => {
        const group = s.tasks.filter(t => t.priority === priority && t.status === "todo")
        const others = s.tasks.filter(t => !(t.priority === priority && t.status === "todo"))
        const oldIdx = group.findIndex(t => t.id === activeId)
        const newIdx = group.findIndex(t => t.id === overId)
        if (oldIdx === -1 || newIdx === -1) return s
        const reordered = [...group]
        const [moved] = reordered.splice(oldIdx, 1)
        reordered.splice(newIdx, 0, moved)
        return { tasks: [...others, ...reordered.map((t, i) => ({ ...t, order: i }))] }
      }),
    }),
    { name: "tasks-storage-v2", storage: cloud() }
  )
)

// ─── Project store ────────────────────────────────────────────────
export type ProjectStatus = "active" | "completed" | "paused"

export interface Project {
  id: string
  name: string
  client: string
  description?: string
  color: string
  status: ProjectStatus
  createdAt: number
}

interface ProjectStore {
  projects: Project[]
  addProject: (p: Omit<Project, "id" | "createdAt">) => string
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],
      addProject: (p) => {
        const id = crypto.randomUUID()
        set((s) => ({ projects: [{ ...p, id, createdAt: Date.now() }, ...s.projects] }))
        return id
      },
      updateProject: (id, patch) => set((s) => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...patch } : p) })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter(p => p.id !== id) })),
    }),
    { name: "projects-storage", storage: cloud() }
  )
)

// ─── Invoice History store ────────────────────────────────────────
export type PaymentStatus = "unpaid" | "paid"

export type DocType = "invoice" | "quotation" | "contract" | "proposal"

export interface SavedDoc {
  id: string
  type: DocType
  clientName: string
  title?: string            // project / document name (non-invoice docs)
  docNo?: string            // document number, if any
  dateIssued: string
  dueDate?: string          // ISO date — when payment is due (invoices)
  status?: PaymentStatus    // payment tracking (invoices); default "unpaid"
  total: number
  savedAt: number
  snapshot: unknown
}

interface InvoiceHistoryStore {
  history: SavedDoc[]
  saveDoc: (doc: Omit<SavedDoc, "id" | "savedAt">) => string
  deleteDoc: (id: string) => void
  setDocStatus: (id: string, status: PaymentStatus) => void
}

export const useInvoiceHistoryStore = create<InvoiceHistoryStore>()(
  persist(
    (set) => ({
      history: [],
      saveDoc: (doc) => {
        const id = crypto.randomUUID()
        set((s) => ({ history: [{ status: "unpaid", ...doc, id, savedAt: Date.now() }, ...s.history] }))
        return id
      },
      deleteDoc: (id) => set((s) => ({ history: s.history.filter(d => d.id !== id) })),
      setDocStatus: (id, status) => set((s) => ({ history: s.history.map(d => d.id === id ? { ...d, status } : d) })),
    }),
    { name: "invoice-history-storage", storage: cloud() }
  )
)

// ─── Moodboard store ──────────────────────────────────────────────
export type MoodCategory = "graphic_design" | "product_design" | "3d" | "motion"
export type MediaType = "image" | "video"

export interface MoodProject {
  id: string
  name: string
  createdAt: number
}

export interface MoodItem {
  id: string
  url: string
  title: string
  source_domain: string
  category: MoodCategory
  tags: string[]
  note?: string
  color: string
  image_url?: string
  media_type?: MediaType
  createdAt: number
  projectId?: string   // undefined / null = Global
}

interface MoodStore {
  items: MoodItem[]
  projects: MoodProject[]
  addItem: (item: Omit<MoodItem, "id">) => void
  deleteItem: (id: string) => void
  moveItem: (itemId: string, projectId: string | null) => void
  addProject: (name: string) => string
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void
}

export const useMoodStore = create<MoodStore>()(
  persist(
    (set) => ({
      items: [],
      projects: [],
      addItem: (item) => set((s) => ({ items: [{ ...item, id: crypto.randomUUID(), createdAt: item.createdAt ?? Date.now() }, ...s.items] })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
      moveItem: (itemId, projectId) => set((s) => ({
        items: s.items.map(i => i.id === itemId ? { ...i, projectId: projectId ?? undefined } : i),
      })),
      addProject: (name) => {
        const id = crypto.randomUUID()
        set((s) => ({ projects: [...s.projects, { id, name, createdAt: Date.now() }] }))
        return id
      },
      renameProject: (id, name) => set((s) => ({ projects: s.projects.map(p => p.id === id ? { ...p, name } : p) })),
      deleteProject: (id) => set((s) => ({
        projects: s.projects.filter(p => p.id !== id),
        // Move items from deleted project back to Global
        items: s.items.map(i => i.projectId === id ? { ...i, projectId: undefined } : i),
      })),
    }),
    { name: "moodboard-storage", storage: cloud() }
  )
)

// ─── Finance store ────────────────────────────────────────────────
export type TransactionType = "income" | "expense"

export interface FinanceCategory {
  id: string
  name: string
  color: string
  type: TransactionType
  icon: string
}

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  categoryId: string
  description: string
  date: string   // "2026-06-14"
  month: string  // "2026-06"
  note?: string
}

interface FinanceStore {
  transactions: Transaction[]
  categories: FinanceCategory[]
  addTransaction: (t: Omit<Transaction, "id">) => void
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => void
  deleteTransaction: (id: string) => void
  addCategory: (c: Omit<FinanceCategory, "id">) => void
  deleteCategory: (id: string) => void
}

const DEFAULT_CATEGORIES: FinanceCategory[] = [
  { id: "c1", name: "Freelance", color: "#4e7d2e", type: "income", icon: "building" },
  { id: "c2", name: "Project Bonus", color: "#5DB872", type: "income", icon: "flag" },
  { id: "c3", name: "Software & Tools", color: "#6D8DF0", type: "expense", icon: "settings" },
  { id: "c4", name: "Food & Beverage", color: "#E8A55A", type: "expense", icon: "receipt" },
  { id: "c5", name: "Transport", color: "#C77DD6", type: "expense", icon: "circle-dot" },
  { id: "c6", name: "Housing", color: "#F0A07C", type: "expense", icon: "building" },
  { id: "c7", name: "Health", color: "#4DBFC4", type: "expense", icon: "sparkles" },
  { id: "c8", name: "Entertainment", color: "#D85A4A", type: "expense", icon: "play" },
]

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      addTransaction: (t) => set((s) => ({ transactions: [{ ...t, id: crypto.randomUUID() }, ...s.transactions] })),
      updateTransaction: (id, patch) => set((s) => ({ transactions: s.transactions.map(t => t.id === id ? { ...t, ...patch } : t) })),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter(t => t.id !== id) })),
      addCategory: (c) => set((s) => ({ categories: [...s.categories, { ...c, id: crypto.randomUUID() }] })),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter(c => c.id !== id) })),
    }),
    { name: "finance-storage", storage: cloud() }
  )
)

// ─── Client CRM store ─────────────────────────────────────────────
export type ClientStatus = "lead" | "negotiation" | "active" | "completed" | "lost"

export interface Client {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  status: ClientStatus
  dealValue?: number       // estimated/agreed value (IDR)
  rate?: number            // default hourly rate (IDR) for this client
  notes?: string
  followUpDate?: string    // ISO date — next follow-up reminder
  createdAt: number
}

interface ClientStore {
  clients: Client[]
  addClient: (c: Omit<Client, "id" | "createdAt">) => string
  updateClient: (id: string, patch: Partial<Omit<Client, "id">>) => void
  deleteClient: (id: string) => void
}

export const useClientStore = create<ClientStore>()(
  persist(
    (set) => ({
      clients: [],
      addClient: (c) => {
        const id = crypto.randomUUID()
        set((s) => ({ clients: [{ ...c, id, createdAt: Date.now() }, ...s.clients] }))
        return id
      },
      updateClient: (id, patch) => set((s) => ({ clients: s.clients.map(c => c.id === id ? { ...c, ...patch } : c) })),
      deleteClient: (id) => set((s) => ({ clients: s.clients.filter(c => c.id !== id) })),
    }),
    { name: "clients-storage", storage: cloud() }
  )
)

// ─── Time Tracker store ───────────────────────────────────────────
export interface TimeEntry {
  id: string
  description: string
  projectName?: string
  clientName?: string
  seconds: number          // total tracked duration
  rate: number             // IDR per hour
  date: string             // ISO date "2026-06-15"
  billed: boolean          // already converted to an invoice
  createdAt: number
}

// Active (running) timer — persisted so it survives navigation/reload.
export interface ActiveTimer {
  description: string
  projectName?: string
  clientName?: string
  rate: number
  startedAt: number        // epoch ms
}

interface TimeTrackerStore {
  entries: TimeEntry[]
  active: ActiveTimer | null
  startTimer: (t: Omit<ActiveTimer, "startedAt">) => void
  stopTimer: () => void
  cancelTimer: () => void
  addManualEntry: (e: Omit<TimeEntry, "id" | "createdAt" | "billed"> & { billed?: boolean }) => void
  updateEntry: (id: string, patch: Partial<Omit<TimeEntry, "id">>) => void
  deleteEntry: (id: string) => void
  markBilled: (ids: string[]) => void
}

export const useTimeTrackerStore = create<TimeTrackerStore>()(
  persist(
    (set) => ({
      entries: [],
      active: null,
      startTimer: (t) => set({ active: { ...t, startedAt: Date.now() } }),
      stopTimer: () => set((s) => {
        if (!s.active) return s
        const seconds = Math.max(1, Math.round((Date.now() - s.active.startedAt) / 1000))
        const entry: TimeEntry = {
          id: crypto.randomUUID(),
          description: s.active.description || "Untitled session",
          projectName: s.active.projectName,
          clientName: s.active.clientName,
          seconds,
          rate: s.active.rate,
          date: new Date().toISOString().slice(0, 10),
          billed: false,
          createdAt: Date.now(),
        }
        return { active: null, entries: [entry, ...s.entries] }
      }),
      cancelTimer: () => set({ active: null }),
      addManualEntry: (e) => set((s) => ({ entries: [{ ...e, billed: e.billed ?? false, id: crypto.randomUUID(), createdAt: Date.now() }, ...s.entries] })),
      updateEntry: (id, patch) => set((s) => ({ entries: s.entries.map(e => e.id === id ? { ...e, ...patch } : e) })),
      deleteEntry: (id) => set((s) => ({ entries: s.entries.filter(e => e.id !== id) })),
      markBilled: (ids) => set((s) => ({ entries: s.entries.map(e => ids.includes(e.id) ? { ...e, billed: true } : e) })),
    }),
    { name: "time-tracker-storage", storage: cloud() }
  )
)

// ─── Invoice prefill (transient hand-off) ─────────────────────────
// Used to pass generated line items from the Time Tracker into the Invoice
// builder. NOT persisted — it only lives long enough to seed the form once.
export interface InvoicePrefillItem {
  date: string
  project: string
  title: string
  tasks: string
  hours: number
}
export interface InvoicePrefill {
  clientName: string
  rate: number
  items: InvoicePrefillItem[]
}

interface InvoicePrefillStore {
  prefill: InvoicePrefill | null
  setPrefill: (p: InvoicePrefill | null) => void
}

export const useInvoicePrefillStore = create<InvoicePrefillStore>((set) => ({
  prefill: null,
  setPrefill: (prefill) => set({ prefill }),
}))

// ─── Saved Jobs store ─────────────────────────────────────────────
export interface SavedJob {
  id: string             // original job id from the source feed
  title: string
  company: string
  location: string
  url: string
  category?: string
  savedAt: number
}

interface SavedJobStore {
  jobs: SavedJob[]
  toggleJob: (job: Omit<SavedJob, "savedAt">) => void
  removeJob: (id: string) => void
}

// ─── Integration settings (localStorage only) ─────────────────────
export interface IntegrationSettings {
  remotive: boolean
  linkedin: boolean
  linkedinLocation: string  // e.g. "Remote", "Indonesia", "United States"
  openaiKeyMasked: string   // display only, never stored in full
}

interface IntegrationStore {
  settings: IntegrationSettings
  update: (patch: Partial<IntegrationSettings>) => void
}

export const useIntegrationStore = create<IntegrationStore>()(
  persist(
    (set) => ({
      settings: {
        remotive: true,
        linkedin: true,
        linkedinLocation: "Remote",
        openaiKeyMasked: "",
      },
      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    { name: "integrations-storage" }  // localStorage is fine — no sensitive data
  )
)

export const useSavedJobStore = create<SavedJobStore>()(
  persist(
    (set) => ({
      jobs: [],
      toggleJob: (job) => set((s) => (
        s.jobs.some((j) => j.id === job.id)
          ? { jobs: s.jobs.filter((j) => j.id !== job.id) }
          : { jobs: [{ ...job, savedAt: Date.now() }, ...s.jobs] }
      )),
      removeJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
    }),
    { name: "saved-jobs-storage", storage: cloud() }
  )
)

// ─── Meeting Transcript store ─────────────────────────────────────
export interface ExtractedTask {
  title: string
  priority: "high" | "medium" | "low"
  deadline?: string   // ISO date "2026-06-20" if the transcript mentions one
  notes?: string
  emphasis?: string   // what Bayu must specifically focus on / not miss for this task
}

export interface MeetingChatMessage {
  role: "assistant" | "user"
  content: string
  timestamp: number
}

export interface MeetingAnalysis {
  id: string
  title: string
  date: string
  summary: string
  // Mood / sentiment
  moodScore: number        // 0-100 how happy/positive the overall meeting tone was
  moodLabel: string        // e.g. "Produktif & Positif", "Tegang", "Netral"
  moodReason: string       // 1 sentence why this score
  // Core extractions
  tasks: ExtractedTask[]
  watchPoints: string[]
  improvements: string[]
  decisions: string[]      // key decisions that were settled in the meeting
  waitingOn: string[]      // things Bayu is blocked on / waiting from others
  openQuestions: string[]  // unresolved items that need follow-up
  // Session chat
  chatHistory: MeetingChatMessage[]
  savedAt: number
}

interface MeetingStore {
  meetings: MeetingAnalysis[]
  saveMeeting: (m: Omit<MeetingAnalysis, "id" | "savedAt">) => string
  updateMeeting: (id: string, patch: Partial<Omit<MeetingAnalysis, "id">>) => void
  deleteMeeting: (id: string) => void
}

export const useMeetingStore = create<MeetingStore>()(
  persist(
    (set) => ({
      meetings: [],
      saveMeeting: (m) => {
        const id = crypto.randomUUID()
        set((s) => ({ meetings: [{ ...m, id, savedAt: Date.now() }, ...s.meetings] }))
        return id
      },
      updateMeeting: (id, patch) => set((s) => ({
        meetings: s.meetings.map((m) => m.id === id ? { ...m, ...patch } : m)
      })),
      deleteMeeting: (id) => set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),
    }),
    { name: "meeting-store-v1", storage: cloud() }
  )
)

// ─── Cross-store rehydration ──────────────────────────────────────
// Zustand's persist middleware hydrates each store once at module load —
// which happens BEFORE the user signs in (so it reads empty anon data).
// After login we must explicitly re-read every cloud store from Supabase.
import { useAssetStore, usePromptStore, useSitemapStore, useWorkflowRunStore, useWorkflowStore } from "./aiStore"

const PERSISTED_STORES = [
  useTaskStore, useProjectStore, useInvoiceHistoryStore, useMoodStore, useFinanceStore,
  useClientStore, useTimeTrackerStore, useIntegrationStore, useSavedJobStore,
  usePromptStore, useWorkflowRunStore, useWorkflowStore, useSitemapStore, useAssetStore,
  useMeetingStore,
]

export async function rehydrateAllStores(): Promise<void> {
  await Promise.allSettled(
    PERSISTED_STORES.map((s) => {
      const p = (s as unknown as { persist?: { rehydrate?: () => Promise<void> | void } }).persist
      return p?.rehydrate ? p.rehydrate() : Promise.resolve()
    })
  )
}
