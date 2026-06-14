"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useRef, useState } from "react";
import { Plus, ExternalLink, Trash2, UploadCloud, X, Play } from "lucide-react";
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

// Varying heights for mosaic feel
const mosaicHeights = [220, 300, 260, 340, 200, 280, 320, 240, 180, 310, 260, 200];

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function MoodboardPage() {
  const { items, addItem, deleteItem } = useMoodStore();
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<MoodCategory>("graphic_design");
  const [newTags, setNewTags] = useState("");
  const [newNote, setNewNote] = useState("");
  const [mediaData, setMediaData] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [mediaName, setMediaName] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = activeCategory === "all" ? items : items.filter((i) => i.category === activeCategory);
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
    });
    setShowModal(false);
    resetForm();
  };

  return (
    <ShellLayout>
      <PageHeader
        title="Moodboard"
        subtitle={`${items.length} references collected`}
        actions={<Button onClick={() => setShowModal(true)}><Plus size={15} /> Add Reference</Button>}
      />

      {/* Category tabs */}
      <div className="mb-7">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as Category)}>
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat}>{categoryLabels[cat]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Mosaic 3-column grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>No references in this category yet.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 gap-4">
          <AnimatePresence>
            {filtered.map((item, idx) => {
              const height = mosaicHeights[idx % mosaicHeights.length];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18, delay: idx * 0.03 }}
                  className="break-inside-avoid mb-4 rounded-[14px] overflow-hidden group relative"
                  style={{ height }}
                >
                  {/* Media: image, video, or gradient fallback */}
                  {item.image_url && item.media_type === "video" ? (
                    <video
                      src={item.image_url}
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                      onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ background: resolveCover(item.color, item.id) }}
                    />
                  ) : item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ background: resolveCover(item.color, item.id) }}
                      onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                    />
                  ) : (
                    <div
                      className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                      style={{ background: resolveCover(item.color, item.id) }}
                    />
                  )}

                  {/* Video indicator */}
                  {item.media_type === "video" && (
                    <div className="absolute top-2.5 left-2.5 w-7 h-7 bg-black/55 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-80 group-hover:opacity-0 transition-opacity">
                      <Play size={12} className="text-white fill-white" />
                    </div>
                  )}

                  {/* Hover overlay with info */}
                  <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)" }}
                  >
                    <div className="p-3 pb-3.5">
                      <p className="text-[13px] font-semibold leading-tight text-white line-clamp-2 mb-1">{item.title}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-white/70 truncate">{item.source_domain || (item.media_type === "video" ? "Video" : "Image")}</span>
                        <Badge variant={categoryBadge[item.category]}>{categoryShort[item.category]}</Badge>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white shadow-sm transition-colors">
                          <ExternalLink size={12} className="text-[#3D5159]" />
                        </a>
                      )}
                      <button onClick={() => deleteItem(item.id)} className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-red-50 shadow-sm transition-colors">
                        <Trash2 size={12} className="text-[#C64545]" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Reference Dialog */}
      <Dialog open={showModal} onOpenChange={(o) => { setShowModal(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reference</DialogTitle>
            <DialogDescription>Upload an image or video for your board</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-5">
            {/* Upload / preview area */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {mediaData ? (
              <div className="relative h-48 rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--color-hairline)" }}>
                {mediaType === "video" ? (
                  <video src={mediaData} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={mediaData} alt={mediaName} className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => { setMediaData(null); setMediaType(null); setMediaName(""); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/55 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/75 transition-colors"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                className="h-48 rounded-[10px] flex flex-col items-center justify-center gap-2 transition-colors"
                style={{
                  border: `2px dashed ${dragActive ? "#2A9D8F" : "var(--color-hairline)"}`,
                  background: dragActive ? "var(--color-primary-light)" : "var(--color-canvas)",
                }}
              >
                <UploadCloud size={26} className="text-[#2A9D8F]" />
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
