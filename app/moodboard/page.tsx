"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useRef, useState, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { useMoodStore, type MoodCategory, type MediaType } from "@/lib/store";
import { resolveCover } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

type Category = "all" | MoodCategory;
type DateFilter = "all" | "today" | "week" | "month";

const categoryLabels: Record<Category, string> = {
  all: "All",
  graphic_design: "Graphic Design",
  product_design: "Product Design",
  "3d": "3D",
  motion: "Motion",
};

const categoryShort: Record<MoodCategory, string> = {
  graphic_design: "GD", product_design: "PD", "3d": "3D", motion: "MO",
};

const categoryBadge: Record<MoodCategory, "teal" | "purple" | "gray"> = {
  graphic_design: "teal", product_design: "purple", "3d": "gray", motion: "gray",
};

const dateLabels: Record<DateFilter, string> = {
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
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lightbox, setLightbox] = useState<typeof items[0] | null>(null);

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
    let list = activeCategory === "all" ? items : items.filter((i) => i.category === activeCategory);
    if (dateFilter !== "all") {
      const since = startOf(dateFilter);
      list = list.filter((i) => (i.createdAt ?? 0) >= since);
    }
    return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [items, activeCategory, dateFilter]);

  const categories: Category[] = ["all", "graphic_design", "product_design", "3d", "motion"];

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
      title: newTitle.trim() || "Untitled reference",
      source_domain: domain,
      category: newCategory,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
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
    <ShellLayout>
      <PageHeader
        title="Moodboard"
        subtitle={`${items.length} references collected`}
        actions={<Button onClick={() => setShowModal(true)}><Icon name="plus" size={15} /> Add Reference</Button>}
      />

      {/* Filters: category tabs + date dropdown */}
      <div className="mb-7 flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as Category)}>
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat}>{categoryLabels[cat]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Date filter */}
        <div className="relative">
          <button
            onClick={() => setShowDateMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all border"
            style={
              dateFilter !== "all"
                ? { background: "var(--color-primary-light)", color: "#1C4F4F", borderColor: "#2A9D8F" }
                : { background: "var(--color-surface)", color: "var(--color-muted)", borderColor: "var(--color-hairline)" }
            }
          >
            {dateLabels[dateFilter]} <Icon name="chevron-down" size={13} />
          </button>
          <AnimatePresence>
            {showDateMenu && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-1.5 z-50 rounded-[12px] overflow-hidden py-1 min-w-[150px] shadow-[0_8px_24px_rgba(16,40,48,0.12)]"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}
              >
                {(Object.keys(dateLabels) as DateFilter[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDateFilter(d); setShowDateMenu(false); }}
                    className="w-full text-left px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--color-canvas)]"
                    style={{ color: dateFilter === d ? "var(--color-ink)" : "var(--color-muted)" }}
                  >
                    {dateLabels[d]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cosmos-style masonry grid (natural aspect ratio, tight gap) */}
      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>No references in this range yet.</p>
        </div>
      ) : (
        <>
          <style>{`
            .mood-grid { columns: 2; column-gap: 10px; }
            @media (min-width: 640px) { .mood-grid { columns: 3; } }
            @media (min-width: 1100px) { .mood-grid { columns: 4; } }
          `}</style>
          <div className="mood-grid">
            <AnimatePresence>
              {filtered.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="break-inside-avoid mb-2.5 group relative overflow-hidden rounded-[12px] cursor-zoom-in"
                  style={{ border: "1px solid var(--color-hairline)" }}
                  onClick={() => setLightbox(item)}
                >
                  {/* Media — natural aspect ratio */}
                  {item.image_url && item.media_type === "video" ? (
                    <video
                      src={item.image_url}
                      muted loop playsInline
                      onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                      onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
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
                      onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                    />
                  ) : (
                    <div style={{ background: resolveCover(item.color, item.id), aspectRatio: "4/3" }} />
                  )}

                  {/* Video badge */}
                  {item.media_type === "video" && (
                    <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-lg flex items-center justify-center opacity-80 group-hover:opacity-0 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.55)" }}>
                      <Icon name="play" size={11} className="text-white" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)" }}
                  >
                    <div className="p-3 pb-3.5">
                      <p className="text-[13px] font-semibold leading-tight text-white line-clamp-2 mb-1">{item.title}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-white/70 truncate">
                          {item.source_domain || new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                        <Badge variant={categoryBadge[item.category]}>{categoryShort[item.category]}</Badge>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="absolute top-2.5 right-2.5 flex gap-1.5" onClick={e => e.stopPropagation()}>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white shadow-sm transition-colors">
                          <Icon name="external-link" size={12} className="text-[#3D5159]" />
                        </a>
                      )}
                      <button onClick={() => deleteItem(item.id)} className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-red-50 shadow-sm transition-colors">
                        <Icon name="trash" size={12} className="text-[#C64545]" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{lightbox?.title}</DialogTitle>
            <DialogDescription>{lightbox?.source_domain}</DialogDescription>
          </DialogHeader>
          {lightbox && (
            <div className="relative bg-black">
              {lightbox.image_url && lightbox.media_type === "video" ? (
                <video src={lightbox.image_url} controls autoPlay className="w-full max-h-[80vh] object-contain" />
              ) : lightbox.image_url ? (
                <img src={lightbox.image_url} alt={lightbox.title} className="w-full max-h-[80vh] object-contain" />
              ) : (
                <div className="w-full h-64" style={{ background: resolveCover(lightbox.color, lightbox.id) }} />
              )}
              <div className="absolute bottom-0 inset-x-0 px-5 py-4" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}>
                <p className="text-white font-semibold text-[15px]">{lightbox.title}</p>
                <p className="text-white/60 text-[12px] mt-0.5">{lightbox.source_domain || new Date(lightbox.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Reference Dialog */}
      <Dialog open={showModal} onOpenChange={(o) => { setShowModal(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reference</DialogTitle>
            <DialogDescription>Upload an image or video for your board</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-5">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={(e) => handleFiles(e.target.files)} />

            {/* Upload / preview */}
            {mediaData ? (
              <div className="relative rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--color-hairline)" }}>
                {mediaType === "video"
                  ? <video src={mediaData} controls className="w-full max-h-56 object-cover" />
                  : <img src={mediaData} alt={mediaName} className="w-full max-h-56 object-cover" />}
                <button onClick={() => { setMediaData(null); setMediaType(null); setMediaName(""); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors">
                  <Icon name="x" size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                className="h-44 rounded-[10px] flex flex-col items-center justify-center gap-2 transition-colors"
                style={{
                  border: `2px dashed ${dragActive ? "#2A9D8F" : "var(--color-hairline)"}`,
                  background: dragActive ? "var(--color-primary-light)" : "var(--color-canvas)",
                }}>
                <Icon name="upload-cloud" size={26} className="text-[#2A9D8F]" />
                <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Click to upload or drag & drop</p>
                <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Image or video file</p>
              </button>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Title</label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Reference title" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Source link (optional)</label>
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://dribbble.com/shots/..." />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Category</label>
              <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value as MoodCategory)}>
                <option value="graphic_design">Graphic Design</option>
                <option value="product_design">Product Design</option>
                <option value="3d">3D</option>
                <option value="motion">Motion</option>
              </Select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Tags (comma separated)</label>
              <Input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="typography, branding, minimal" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Note (optional)</label>
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} placeholder="What do you like about this?" />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddItem} disabled={!mediaData}>Add to Board</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}
