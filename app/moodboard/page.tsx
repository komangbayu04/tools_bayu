"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { useRef, useState, useMemo } from "react";
import { Plus, Trash2, UploadCloud, X, Play, ChevronDown } from "lucide-react";
import { useMoodStore, type MoodCategory, type MediaType } from "@/lib/store";
import { resolveCover } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

type DateFilter = "all" | "today" | "week" | "month";

const CATEGORY_LABELS: Record<"all" | MoodCategory, string> = {
  all: "All",
  graphic_design: "Graphic Design",
  product_design: "Product Design",
  "3d": "3D",
  motion: "Motion",
};

const CAT_SHORT: Record<MoodCategory, string> = {
  graphic_design: "GD", product_design: "PD", "3d": "3D", motion: "MO",
};

const DATE_LABELS: Record<DateFilter, string> = {
  all: "All time",
  today: "Today",
  week: "This week",
  month: "This month",
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const startOf = (unit: "today" | "week" | "month") => {
  const now = new Date();
  if (unit === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (unit === "week") { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d.getTime(); }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
};

export default function MoodboardPage() {
  const { items, addItem, deleteItem } = useMoodStore();
  const [activeCategory, setActiveCategory] = useState<"all" | MoodCategory>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<MoodCategory>("graphic_design");
  const [newTags, setNewTags] = useState("");
  const [newNote, setNewNote] = useState("");
  const [mediaData, setMediaData] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [mediaName, setMediaName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let list = activeCategory === "all" ? items : items.filter(i => i.category === activeCategory);
    if (dateFilter !== "all") {
      const since = startOf(dateFilter);
      list = list.filter(i => (i.createdAt ?? 0) >= since);
    }
    return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [items, activeCategory, dateFilter]);

  const categories = (["all", "graphic_design", "product_design", "3d", "motion"] as const);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return;
    const dataUrl = await readFileAsDataUrl(file);
    setMediaData(dataUrl);
    setMediaType(isVideo ? "video" : "image");
    setMediaName(file.name);
    if (!newTitle) setNewTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const resetForm = () => {
    setNewTitle(""); setNewUrl(""); setNewCategory("graphic_design");
    setNewTags(""); setNewNote(""); setMediaData(null); setMediaType(null); setMediaName("");
  };

  const handleAddItem = () => {
    if (!mediaData) return;
    let domain = "";
    if (newUrl) { try { domain = new URL(newUrl).hostname.replace("www.", ""); } catch { domain = newUrl; } }
    addItem({
      url: newUrl,
      title: newTitle.trim() || "Untitled",
      source_domain: domain,
      category: newCategory,
      tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
      note: newNote,
      color: "linear-gradient(135deg,#2A9D8F,#1C4F4F)",
      image_url: mediaData,
      media_type: mediaType ?? "image",
      createdAt: Date.now(),
    });
    setShowModal(false);
    resetForm();
  };

  return (
    // Override the white surface with cosmos-style dark bg on this page
    <div className="min-h-screen" style={{ background: "#0d0d0d" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-7 pb-5 md:px-10">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white">Moodboard</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "#666" }}>{items.length} references</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-1.5">
          <Plus size={15} /> Add
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 pb-5 md:px-10 flex-wrap">
        {/* Category pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1 rounded-full text-[12px] font-semibold transition-all"
              style={activeCategory === cat
                ? { background: "#fff", color: "#0d0d0d" }
                : { background: "#1e1e1e", color: "#888" }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Date filter dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowDateMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-all"
            style={{ background: dateFilter !== "all" ? "#fff" : "#1e1e1e", color: dateFilter !== "all" ? "#0d0d0d" : "#888" }}
          >
            {DATE_LABELS[dateFilter]} <ChevronDown size={12} />
          </button>
          <AnimatePresence>
            {showDateMenu && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-1.5 z-50 rounded-[10px] overflow-hidden py-1 min-w-[140px]"
                style={{ background: "#1e1e1e", border: "1px solid #333" }}
              >
                {(Object.keys(DATE_LABELS) as DateFilter[]).map(d => (
                  <button
                    key={d}
                    onClick={() => { setDateFilter(d); setShowDateMenu(false); }}
                    className="w-full text-left px-4 py-2 text-[12px] font-medium transition-colors hover:bg-white/10"
                    style={{ color: dateFilter === d ? "#fff" : "#999" }}
                  >
                    {DATE_LABELS[d]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cosmos-style masonry grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-32">
          <p className="text-[13px]" style={{ color: "#555" }}>No references yet.</p>
        </div>
      ) : (
        <div className="px-6 pb-12 md:px-10" style={{ columns: "2", columnGap: "4px" }}
          // Responsive columns via inline style trick — use a custom approach
        >
          <style>{`
            @media (min-width: 640px) { .cosmos-grid { columns: 3 !important; } }
            @media (min-width: 900px) { .cosmos-grid { columns: 4 !important; } }
            @media (min-width: 1200px) { .cosmos-grid { columns: 5 !important; } }
          `}</style>
          <div className="cosmos-grid" style={{ columns: 2, columnGap: "4px" }}>
            <AnimatePresence>
              {filtered.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="break-inside-avoid mb-1 group relative overflow-hidden"
                  style={{ borderRadius: 4 }}
                >
                  {/* Media */}
                  {item.image_url && item.media_type === "video" ? (
                    <video
                      src={item.image_url}
                      muted loop playsInline
                      onMouseEnter={e => e.currentTarget.play().catch(() => {})}
                      onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      className="w-full block"
                      style={{ display: "block", background: resolveCover(item.color, item.id) }}
                    />
                  ) : item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      loading="lazy"
                      className="w-full block"
                      style={{ display: "block", background: resolveCover(item.color, item.id) }}
                      onError={e => { e.currentTarget.style.visibility = "hidden"; }}
                    />
                  ) : (
                    // Gradient placeholder — give it a 4:3 ratio
                    <div style={{ background: resolveCover(item.color, item.id), aspectRatio: "4/3" }} />
                  )}

                  {/* Video badge */}
                  {item.media_type === "video" && (
                    <div className="absolute top-2 left-2 w-6 h-6 rounded flex items-center justify-center opacity-80 group-hover:opacity-0 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.6)" }}>
                      <Play size={10} className="text-white fill-white" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 60%, transparent 100%)" }}
                  >
                    {/* Delete */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/80"
                        style={{ background: "rgba(0,0,0,0.5)" }}
                      >
                        <Trash2 size={11} className="text-white" />
                      </button>
                    </div>

                    {/* Info */}
                    <div>
                      <p className="text-[12px] font-semibold text-white leading-tight line-clamp-2">{item.title}</p>
                      <div className="flex items-center justify-between mt-1 gap-1">
                        <span className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                          {item.source_domain || new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>
                          {CAT_SHORT[item.category]}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Add Reference Dialog */}
      <Dialog open={showModal} onOpenChange={o => { setShowModal(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reference</DialogTitle>
            <DialogDescription>Upload an image or video for your board</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-5">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={e => handleFiles(e.target.files)} />

            {/* Upload / preview */}
            {mediaData ? (
              <div className="relative rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--color-hairline)" }}>
                {mediaType === "video"
                  ? <video src={mediaData} controls className="w-full max-h-56 object-cover" />
                  : <img src={mediaData} alt={mediaName} className="w-full max-h-56 object-cover" />}
                <button onClick={() => { setMediaData(null); setMediaType(null); setMediaName(""); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors">
                  <X size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                className="h-44 rounded-[10px] flex flex-col items-center justify-center gap-2 transition-colors"
                style={{
                  border: `2px dashed ${dragActive ? "#2A9D8F" : "var(--color-hairline)"}`,
                  background: dragActive ? "var(--color-primary-light)" : "var(--color-canvas)",
                }}>
                <UploadCloud size={26} className="text-[#2A9D8F]" />
                <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Click or drag & drop</p>
                <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Image or video</p>
              </button>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Title</label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Reference title" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Source link (optional)</label>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Category</label>
              <Select value={newCategory} onChange={e => setNewCategory(e.target.value as MoodCategory)}>
                <option value="graphic_design">Graphic Design</option>
                <option value="product_design">Product Design</option>
                <option value="3d">3D</option>
                <option value="motion">Motion</option>
              </Select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Tags (comma separated)</label>
              <Input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="typography, branding" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Note (optional)</label>
              <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} placeholder="What do you like about this?" />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddItem} disabled={!mediaData}>Add to Board</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
