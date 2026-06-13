import { create } from "zustand"
import { persist } from "zustand/middleware"

// --- Task store ---
export type Priority = "high" | "medium" | "low"
export type TaskStatus = "todo" | "done"

export interface Task {
  id: string
  title: string
  project: string
  priority: Priority
  status: TaskStatus
  due?: string
  source: "manual" | "transcript"
  order: number
}

interface TaskStore {
  tasks: Task[]
  addTask: (task: Omit<Task, "id" | "order">) => void
  toggleDone: (id: string) => void
  deleteTask: (id: string) => void
  reorderTasks: (priority: Priority, activeId: string, overId: string) => void
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [
        { id: "1", title: "Revisi cover slide deck Overclock ke light mode", project: "Overclock", priority: "high", status: "todo", due: "16 Jun", source: "transcript", order: 0 },
        { id: "2", title: "Build reusable email template Bedford", project: "Bedford", priority: "high", status: "todo", due: "18 Jun", source: "manual", order: 1 },
        { id: "3", title: 'Finalize "The Current" newsletter revision', project: "Bedford", priority: "medium", status: "todo", source: "transcript", order: 0 },
        { id: "4", title: "Update brand deck transition slides", project: "Overclock", priority: "medium", status: "todo", source: "transcript", order: 1 },
        { id: "5", title: "Research competitor moodboards for Q3", project: "Internal", priority: "low", status: "todo", source: "manual", order: 0 },
        { id: "6", title: "Send revised deck to Ahmed", project: "Overclock", priority: "high", status: "done", source: "transcript", order: 2 },
      ],
      addTask: (task) => set((s) => ({
        tasks: [...s.tasks, { ...task, id: crypto.randomUUID(), order: s.tasks.filter(t => t.priority === task.priority).length }]
      })),
      toggleDone: (id) => set((s) => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) })),
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
    { name: "tasks-storage" }
  )
)

// --- Moodboard store ---
export type MoodCategory = "graphic_design" | "product_design" | "3d" | "motion"

export interface MoodItem {
  id: string
  url: string
  title: string
  source_domain: string
  category: MoodCategory
  tags: string[]
  note?: string
  color: string
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
        { id: "1", url: "https://dribbble.com", title: "Minimal Brand Identity System", source_domain: "dribbble.com", category: "graphic_design", tags: ["branding", "minimal"], color: "#E0F0F0", note: "Love the whitespace handling" },
        { id: "2", url: "https://behance.net", title: "Product UI Design Case Study", source_domain: "behance.net", category: "product_design", tags: ["ui"], color: "#DDE8F5" },
        { id: "3", url: "https://are.na", title: "Brutalist Web Design Collection", source_domain: "are.na", category: "graphic_design", tags: ["brutalism"], color: "#F4E8D8" },
        { id: "4", url: "https://vimeo.com", title: "Motion Graphics Showreel 2025", source_domain: "vimeo.com", category: "motion", tags: ["motion"], color: "#F0E0F0" },
        { id: "5", url: "https://awwwards.com", title: "Experimental 3D Typography", source_domain: "awwwards.com", category: "3d", tags: ["3d"], color: "#E0F0E8" },
        { id: "6", url: "https://pinterest.com", title: "Packaging Design Inspiration", source_domain: "pinterest.com", category: "graphic_design", tags: ["packaging"], color: "#FDE8D8" },
        { id: "7", url: "https://behance.net", title: "Dark Mode App Design System", source_domain: "behance.net", category: "product_design", tags: ["dark mode"], color: "#E8E0F5" },
        { id: "8", url: "https://motionographer.com", title: "Title Sequence Animation", source_domain: "motionographer.com", category: "motion", tags: ["film"], color: "#D8F0F4" },
      ],
      addItem: (item) => set((s) => ({ items: [{ ...item, id: crypto.randomUUID() }, ...s.items] })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
    }),
    { name: "moodboard-storage" }
  )
)
