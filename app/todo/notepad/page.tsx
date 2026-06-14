"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shell/PageHeader";
import { Icon } from "@/components/ui/icon";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

interface NoteStore {
  notes: Note[];
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
}

const NOTE_COLORS = [
  { bg: "var(--color-surface-card)", label: "Default" },
  { bg: "#FFF5E6", label: "Orange" },
  { bg: "#E8F4F8", label: "Blue" },
  { bg: "#F0F8E8", label: "Green" },
  { bg: "#F8E8F8", label: "Purple" },
  { bg: "#F8F0E8", label: "Warm" },
];

const useNoteStore = create<NoteStore>()(
  persist(
    (set) => ({
      notes: [
        {
          id: "n1",
          title: "Ide desain Q3",
          content: "- Eksplorasi dark mode untuk semua klien\n- Coba gradien oranye di hero section\n- Riset tipografi sans-serif baru",
          color: NOTE_COLORS[1].bg,
          pinned: true,
          createdAt: Date.now() - 2 * 86400000,
          updatedAt: Date.now() - 86400000,
        },
        {
          id: "n2",
          title: "Meeting notes — Artivo",
          content: "Revisi deck selesai minggu ini.\nKirim ke klien Senin pagi.\nFeedback terkait warna header.",
          color: NOTE_COLORS[0].bg,
          pinned: false,
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 3600000,
        },
      ],
      addNote: (note) => {
        const id = crypto.randomUUID();
        set((s) => ({
          notes: [{ ...note, id, createdAt: Date.now(), updatedAt: Date.now() }, ...s.notes],
        }));
        return id;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
        })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    { name: "notepad-storage" }
  )
);

function NoteCard({ note, onClick }: { note: Note; onClick: () => void }) {
  const { updateNote, deleteNote } = useNoteStore();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.15 }}
      className="group relative rounded-[16px] p-4 cursor-pointer hover:shadow-md transition-shadow duration-150"
      style={{ background: note.color, border: "1px solid var(--color-hairline)" }}
      onClick={onClick}
    >
      {/* Pin + delete row */}
      <div className="flex items-start justify-between mb-2 gap-2">
        {note.title ? (
          <p className="text-[14px] font-semibold leading-snug flex-1" style={{ color: "var(--color-ink)" }}>
            {note.title}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateNote(note.id, { pinned: !note.pinned });
            }}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-black/10"
            title={note.pinned ? "Unpin" : "Pin"}
          >
            <Icon
              name="flag"
              size={11}
              style={{ color: note.pinned ? "var(--color-primary)" : "var(--color-muted-soft)" }}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNote(note.id);
            }}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-red-100"
            title="Hapus"
          >
            <Icon name="trash" size={11} style={{ color: "var(--color-muted-soft)" }} />
          </button>
        </div>
      </div>

      {note.content && (
        <p
          className="text-[13px] leading-relaxed line-clamp-4 whitespace-pre-line"
          style={{ color: "var(--color-body)" }}
        >
          {note.content}
        </p>
      )}

      <p className="text-[11px] mt-3" style={{ color: "var(--color-muted)" }}>
        {format(new Date(note.updatedAt), "d MMM, HH:mm", { locale: id })}
      </p>

      {note.pinned && (
        <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
      )}
    </motion.div>
  );
}

function NoteEditor({
  note,
  onClose,
}: {
  note: Note | null;
  onClose: () => void;
}) {
  const { addNote, updateNote } = useNoteStore();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color, setColor] = useState(note?.color ?? NOTE_COLORS[0].bg);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  const save = () => {
    if (!title.trim() && !content.trim()) {
      onClose();
      return;
    }
    if (note) {
      updateNote(note.id, { title, content, color });
    } else {
      addNote({ title, content, color, pinned: false });
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => e.target === e.currentTarget && save()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ duration: 0.16 }}
        className="w-full max-w-lg rounded-[20px] shadow-2xl overflow-hidden"
        style={{ background: color, border: "1px solid var(--color-hairline)" }}
      >
        <div className="p-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul (opsional)"
            className="w-full bg-transparent text-[16px] font-semibold outline-none placeholder:opacity-40 mb-3"
            style={{ color: "var(--color-ink)" }}
          />
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis catatan..."
            rows={8}
            className="w-full bg-transparent text-[14px] leading-relaxed outline-none resize-none placeholder:opacity-40"
            style={{ color: "var(--color-body)" }}
          />
        </div>

        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: "1px solid var(--color-hairline)" }}
        >
          <div className="flex items-center gap-1.5">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.bg}
                onClick={() => setColor(c.bg)}
                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c.bg === "var(--color-surface-card)" ? "#f9fafb" : c.bg,
                  borderColor: color === c.bg ? "var(--color-primary)" : "var(--color-hairline)",
                }}
                title={c.label}
              />
            ))}
          </div>
          <button
            onClick={save}
            className="px-4 py-1.5 rounded-xl text-[13px] font-semibold text-[var(--color-on-primary)] transition-opacity hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            Simpan
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function NotepadPage() {
  const { notes } = useNoteStore();
  const [editing, setEditing] = useState<Note | null | "new">(null);
  const [search, setSearch] = useState("");

  const filtered = notes
    .filter((n) => {
      const q = search.toLowerCase();
      return !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);

  const pinned = filtered.filter((n) => n.pinned);
  const unpinned = filtered.filter((n) => !n.pinned);

  return (
    <div>
      <PageHeader
        eyebrow="Workboard"
        title="Notepad"
        subtitle="Tulis ide, catatan meeting, atau hal-hal penting"
        actions={
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-[var(--color-on-primary)] transition-opacity hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            <Icon name="plus" size={14} />
            <span>Catatan Baru</span>
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Icon
          name="search"
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-muted-soft)" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari catatan..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none border"
          style={{
            background: "var(--color-surface-card)",
            borderColor: "var(--color-hairline)",
            color: "var(--color-ink)",
          }}
        />
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(78,125,46,0.1)" }}
          >
            <Icon name="edit" size={22} style={{ color: "var(--color-primary)" }} />
          </div>
          <p className="text-[15px] font-semibold" style={{ color: "var(--color-ink)" }}>
            Belum ada catatan
          </p>
          <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
            Buat catatan pertamamu
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted)" }}>
                Disematkan
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {pinned.map((note) => (
                    <NoteCard key={note.id} note={note} onClick={() => setEditing(note)} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {unpinned.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted)" }}>
                  Lainnya
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {unpinned.map((note) => (
                    <NoteCard key={note.id} note={note} onClick={() => setEditing(note)} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>
      )}

      <AnimatePresence>
        {editing !== null && (
          <NoteEditor
            note={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
