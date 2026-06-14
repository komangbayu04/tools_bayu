"use client";

import { useState, useMemo } from "react";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { usePromptStore, type Prompt } from "@/lib/aiStore";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Editing = Prompt | "new" | null;

const emptyForm = { title: "", category: "", tags: "", content: "" };

export default function PromptLibraryPage() {
  const { prompts, addPrompt, updatePrompt, deletePrompt } = usePromptStore();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState(emptyForm);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(prompts.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [prompts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prompts
      .filter((p) => {
        if (favoritesOnly && !p.favorite) return false;
        if (category !== "All" && p.category !== category) return false;
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [prompts, search, category, favoritesOnly]);

  const openNew = () => {
    setForm(emptyForm);
    setEditing("new");
  };

  const openEdit = (p: Prompt) => {
    setForm({ title: p.title, category: p.category, tags: p.tags.join(", "), content: p.content });
    setEditing(p);
  };

  const closeDialog = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category.trim() || "Umum",
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (editing === "new") {
      addPrompt({ ...payload, favorite: false });
    } else if (editing) {
      updatePrompt(editing.id, payload);
    }
    closeDialog();
  };

  const handleCopy = async (p: Prompt) => {
    try {
      await navigator.clipboard.writeText(p.content);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const knownCategories = useMemo(
    () => Array.from(new Set(prompts.map((p) => p.category).filter(Boolean))).sort(),
    [prompts]
  );

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="AI Studio"
        title="Prompt Library"
        subtitle="Simpan, atur, dan gunakan kembali prompt terbaikmu"
        actions={
          <Button onClick={openNew}>
            <Icon name="plus" size={15} /> Prompt Baru
          </Button>
        }
      />

      {/* Toolbar: search + category + favorites */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted)" }}>
            <Icon name="search" size={15} />
          </span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari prompt..."
            className="pl-9"
          />
        </div>

        <div className="w-full sm:w-auto sm:min-w-[170px]">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "Semua Kategori" : c}
              </option>
            ))}
          </Select>
        </div>

        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          className="flex items-center gap-1.5 px-3.5 h-[38px] rounded-[10px] text-[13px] font-semibold transition-all border flex-shrink-0"
          style={
            favoritesOnly
              ? { background: "var(--color-primary-light)", color: "var(--color-primary-ink)", borderColor: "var(--color-primary)" }
              : { background: "var(--color-surface)", color: "var(--color-muted)", borderColor: "var(--color-hairline)" }
          }
        >
          <Icon name="star" size={14} /> Favorit
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}
          >
            <Icon name="sparkles" size={24} />
          </div>
          <p className="text-[15px] font-semibold" style={{ color: "var(--color-ink)" }}>
            {prompts.length === 0 ? "Belum ada prompt" : "Tidak ada prompt yang cocok"}
          </p>
          <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
            {prompts.length === 0
              ? "Buat prompt pertamamu untuk memulai library."
              : "Coba ubah kata kunci atau filter."}
          </p>
          {prompts.length === 0 && (
            <Button variant="outline" onClick={openNew} className="mt-1">
              <Icon name="plus" size={15} /> Prompt Baru
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((p, idx) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.18) }}
              >
                <Card className="group relative flex flex-col h-full p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <h3 className="text-[15px] font-semibold leading-snug line-clamp-2" style={{ color: "var(--color-ink)" }}>
                      {p.title}
                    </h3>
                    <button
                      onClick={() => updatePrompt(p.id, { favorite: !p.favorite })}
                      className="flex-shrink-0 p-1 -m-1 transition-colors"
                      style={{ color: p.favorite ? "var(--color-primary)" : "var(--color-muted-soft)" }}
                      aria-label="Toggle favorit"
                    >
                      <Icon name="star" size={17} />
                    </button>
                  </div>

                  {p.category && (
                    <div className="mb-3">
                      <Badge variant="teal">{p.category}</Badge>
                    </div>
                  )}

                  <p
                    className="text-[13px] leading-relaxed whitespace-pre-line line-clamp-3 mb-3"
                    style={{ color: "var(--color-body)" }}
                  >
                    {p.content}
                  </p>

                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                          style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: "var(--color-hairline)" }}>
                    <span className="text-[11px]" style={{ color: "var(--color-muted-soft)" }}>
                      {format(p.createdAt, "d MMM yyyy", { locale: idLocale })}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(p)} aria-label="Salin prompt">
                        {copiedId === p.id ? (
                          <span className="flex items-center gap-1 text-[12px] font-semibold px-1" style={{ color: "var(--color-primary)" }}>
                            <Icon name="check" size={14} /> Tersalin!
                          </span>
                        ) : (
                          <Icon name="copy" size={15} />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit prompt">
                        <Icon name="edit" size={15} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePrompt(p.id)} aria-label="Hapus prompt">
                        <Icon name="trash" size={15} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Prompt Baru" : "Edit Prompt"}</DialogTitle>
            <DialogDescription>
              {editing === "new" ? "Tambahkan prompt baru ke library-mu." : "Perbarui detail prompt ini."}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 flex flex-col gap-5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
                Judul
              </label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Nama prompt" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
                Kategori
              </label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="mis. Coding, Marketing"
                list="prompt-category-options"
              />
              <datalist id="prompt-category-options">
                {knownCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
                Tags (pisahkan dengan koma)
              </label>
              <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="react, ui, copywriting" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
                Isi Prompt
              </label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={7}
                placeholder="Tulis prompt-mu di sini... gunakan {{variabel}} untuk placeholder."
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={closeDialog}>
                Batal
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={!form.title.trim() || !form.content.trim()}>
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}
