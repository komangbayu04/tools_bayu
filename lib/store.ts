import { create } from "zustand"
import { persist } from "zustand/middleware"

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
      tasks: [
        { id: "1", title: "Revisi cover slide deck Overclock ke light mode", description: "Client requested a lighter palette across all cover slides. Update gradient backgrounds and text contrast.", projectId: "p1", priority: "high", status: "in_progress", deadline: "2026-06-16", due: "16 Jun", source: "transcript", order: 0, hours: 2, createdAt: Date.now() - 3 * 86400000 },
        { id: "2", title: "Build reusable email template Bedford", description: "Modular email template with header, hero, CTA, footer blocks.", projectId: "p2", priority: "high", status: "todo", deadline: "2026-06-18", due: "18 Jun", source: "manual", order: 1, hours: 4, createdAt: Date.now() - 2 * 86400000 },
        { id: "3", title: 'Finalize "The Current" newsletter revision', description: "", projectId: "p2", priority: "medium", status: "todo", source: "transcript", order: 0, hours: 1.5, createdAt: Date.now() - 2 * 86400000 },
        { id: "4", title: "Update brand deck transition slides", description: "Apply new branding to all transition slides for consistency.", projectId: "p1", priority: "medium", status: "todo", source: "transcript", order: 1, hours: 3, createdAt: Date.now() - 86400000 },
        { id: "5", title: "Research competitor moodboards for Q3", description: "", projectId: "p3", priority: "low", status: "todo", source: "manual", order: 0, hours: 2, createdAt: Date.now() - 86400000 },
        { id: "6", title: "Send revised deck to Ahmed", description: "Send after revisions complete.", projectId: "p1", priority: "high", status: "done", source: "transcript", order: 2, hours: 1, createdAt: Date.now() - 4 * 86400000 },
      ],
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
    { name: "tasks-storage-v2" }
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
  addProject: (p: Omit<Project, "id" | "createdAt">) => void
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [
        { id: "p1", name: "Overclock", client: "Exo Digital", color: "#2A9D8F", status: "active", createdAt: Date.now() - 14 * 86400000 },
        { id: "p2", name: "Bedford", client: "Bedford Co.", color: "#6D8DF0", status: "active", createdAt: Date.now() - 7 * 86400000 },
        { id: "p3", name: "Internal", client: "Kamarupa", color: "#E8A55A", status: "active", createdAt: Date.now() - 3 * 86400000 },
      ],
      addProject: (p) => set((s) => ({ projects: [{ ...p, id: crypto.randomUUID(), createdAt: Date.now() }, ...s.projects] })),
      updateProject: (id, patch) => set((s) => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...patch } : p) })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter(p => p.id !== id) })),
    }),
    { name: "projects-storage" }
  )
)

// ─── Invoice History store ────────────────────────────────────────
export interface SavedDoc {
  id: string
  type: "invoice" | "quotation"
  clientName: string
  dateIssued: string
  total: number
  savedAt: number
  snapshot: unknown
}

interface InvoiceHistoryStore {
  history: SavedDoc[]
  saveDoc: (doc: Omit<SavedDoc, "id" | "savedAt">) => string
  deleteDoc: (id: string) => void
}

export const useInvoiceHistoryStore = create<InvoiceHistoryStore>()(
  persist(
    (set) => ({
      history: [],
      saveDoc: (doc) => {
        const id = crypto.randomUUID()
        set((s) => ({ history: [{ ...doc, id, savedAt: Date.now() }, ...s.history] }))
        return id
      },
      deleteDoc: (id) => set((s) => ({ history: s.history.filter(d => d.id !== id) })),
    }),
    { name: "invoice-history-storage" }
  )
)

// ─── Moodboard store ──────────────────────────────────────────────
export type MoodCategory = "graphic_design" | "product_design" | "3d" | "motion"
export type MediaType = "image" | "video"

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
}

interface MoodStore {
  items: MoodItem[]
  addItem: (item: Omit<MoodItem, "id">) => void
  deleteItem: (id: string) => void
}

export const useMoodStore = create<MoodStore>()(
  persist(
    (set) => ({
      items: [
        { id: "1", url: "https://dribbble.com", title: "Minimal Brand Identity System", source_domain: "dribbble.com", category: "graphic_design", tags: ["branding", "minimal"], color: "linear-gradient(135deg,#2A9D8F,#1C4F4F)", note: "Love the whitespace handling", createdAt: Date.now() - 7 * 86400000 },
        { id: "2", url: "https://behance.net", title: "Product UI Design Case Study", source_domain: "behance.net", category: "product_design", tags: ["ui", "dark mode"], color: "linear-gradient(135deg,#6D8DF0,#3A4FC4)", createdAt: Date.now() - 6 * 86400000 },
        { id: "3", url: "https://are.na", title: "Brutalist Web Design Collection", source_domain: "are.na", category: "graphic_design", tags: ["brutalism", "typography"], color: "linear-gradient(135deg,#E8A55A,#C16A2E)", createdAt: Date.now() - 5 * 86400000 },
        { id: "4", url: "https://vimeo.com", title: "Motion Graphics Showreel 2025", source_domain: "vimeo.com", category: "motion", tags: ["motion", "film"], color: "linear-gradient(135deg,#C77DD6,#7C4D9E)", createdAt: Date.now() - 4 * 86400000 },
        { id: "5", url: "https://awwwards.com", title: "Experimental 3D Typography", source_domain: "awwwards.com", category: "3d", tags: ["3d", "type"], color: "linear-gradient(135deg,#5DB872,#2E7D4F)", createdAt: Date.now() - 3 * 86400000 },
        { id: "6", url: "https://pinterest.com", title: "Packaging Design Inspiration", source_domain: "pinterest.com", category: "graphic_design", tags: ["packaging", "print"], color: "linear-gradient(135deg,#F0A07C,#D85A4A)", createdAt: Date.now() - 2 * 86400000 },
        { id: "7", url: "https://behance.net", title: "Dark Mode App Design System", source_domain: "behance.net", category: "product_design", tags: ["system design"], color: "linear-gradient(135deg,#8C7DE8,#5240A8)", createdAt: Date.now() - 86400000 },
        { id: "8", url: "https://motionographer.com", title: "Title Sequence Animation", source_domain: "motionographer.com", category: "motion", tags: ["film", "title"], color: "linear-gradient(135deg,#4DBFC4,#2A7E96)", createdAt: Date.now() },
      ],
      addItem: (item) => set((s) => ({ items: [{ ...item, id: crypto.randomUUID(), createdAt: item.createdAt ?? Date.now() }, ...s.items] })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
    }),
    { name: "moodboard-storage" }
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
  deleteTransaction: (id: string) => void
  addCategory: (c: Omit<FinanceCategory, "id">) => void
  deleteCategory: (id: string) => void
}

const DEFAULT_CATEGORIES: FinanceCategory[] = [
  { id: "c1", name: "Freelance", color: "#2A9D8F", type: "income", icon: "💼" },
  { id: "c2", name: "Project Bonus", color: "#5DB872", type: "income", icon: "🎯" },
  { id: "c3", name: "Software & Tools", color: "#6D8DF0", type: "expense", icon: "🛠️" },
  { id: "c4", name: "Food & Beverage", color: "#E8A55A", type: "expense", icon: "🍜" },
  { id: "c5", name: "Transport", color: "#C77DD6", type: "expense", icon: "🚗" },
  { id: "c6", name: "Housing", color: "#F0A07C", type: "expense", icon: "🏠" },
  { id: "c7", name: "Health", color: "#4DBFC4", type: "expense", icon: "💊" },
  { id: "c8", name: "Entertainment", color: "#D85A4A", type: "expense", icon: "🎬" },
]

const now = new Date()
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
const lastMonth = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0")}`

const SAMPLE_TRANSACTIONS: Transaction[] = [
  { id: "t1", amount: 4500000, type: "income", categoryId: "c1", description: "Invoice Zora Springs", date: `${thisMonth}-05`, month: thisMonth, note: "UI/UX project" },
  { id: "t2", amount: 3200000, type: "income", categoryId: "c1", description: "Invoice Nex Healthcare", date: `${thisMonth}-10`, month: thisMonth },
  { id: "t3", amount: 250000, type: "expense", categoryId: "c3", description: "Figma Pro", date: `${thisMonth}-01`, month: thisMonth },
  { id: "t4", amount: 180000, type: "expense", categoryId: "c4", description: "Makan siang meeting", date: `${thisMonth}-06`, month: thisMonth },
  { id: "t5", amount: 450000, type: "expense", categoryId: "c5", description: "Ojek & Grab bulan ini", date: `${thisMonth}-08`, month: thisMonth },
  { id: "t6", amount: 1500000, type: "expense", categoryId: "c6", description: "Sewa kos", date: `${thisMonth}-01`, month: thisMonth },
  { id: "t7", amount: 120000, type: "expense", categoryId: "c8", description: "Netflix + Spotify", date: `${thisMonth}-03`, month: thisMonth },
  { id: "t8", amount: 3800000, type: "income", categoryId: "c1", description: "Invoice Overclock", date: `${lastMonth}-25`, month: lastMonth },
  { id: "t9", amount: 350000, type: "expense", categoryId: "c3", description: "Adobe CC", date: `${lastMonth}-01`, month: lastMonth },
  { id: "t10", amount: 1500000, type: "expense", categoryId: "c6", description: "Sewa kos", date: `${lastMonth}-01`, month: lastMonth },
]

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      transactions: SAMPLE_TRANSACTIONS,
      categories: DEFAULT_CATEGORIES,
      addTransaction: (t) => set((s) => ({ transactions: [{ ...t, id: crypto.randomUUID() }, ...s.transactions] })),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter(t => t.id !== id) })),
      addCategory: (c) => set((s) => ({ categories: [...s.categories, { ...c, id: crypto.randomUUID() }] })),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter(c => c.id !== id) })),
    }),
    { name: "finance-storage" }
  )
)
