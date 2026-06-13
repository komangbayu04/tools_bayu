"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { useState } from "react";
import { Plus, X, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMoodStore, type MoodCategory } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  graphic_design: "GD",
  product_design: "PD",
  "3d": "3D",
  motion: "MO",
};

const categoryBadge: Record<MoodCategory, "teal" | "purple" | "gray"> = {
  graphic_design: "teal",
  product_design: "purple",
  "3d": "gray",
  motion: "gray",
};

// Placeholder design images from picsum
const PLACEHOLDER_IMAGES = [
  "https://picsum.photos/seed/design1/600/400",
  "https://picsum.photos/seed/brand2/600/700",
  "https://picsum.photos/seed/type3/600/500",
  "https://picsum.photos/seed/motion4/600/450",
  "https://picsum.photos/seed/3dtype5/600/600",
  "https://picsum.photos/seed/ui6/600/380",
  "https://picsum.photos/seed/pack7/600/500",
  "https://picsum.photos/seed/anim8/600/650",
];

export default function MoodboardPage() {
  const { items, addItem, deleteItem } = useMoodStore();
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [showModal, setShowModal] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<MoodCategory>("graphic_design");
  const [newTags, setNewTags] = useState("");
  const [newNote, setNewNote] = useState("");
  const [preview, setPreview] = useState<{ title?: string; domain?: string } | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);

  const filtered = activeCategory === "all" ? items : items.filter((i) => i.category === activeCategory);
  const categories: Category[] = ["all", "graphic_design", "product_design", "3d", "motion"];

  const handleUrlBlur = async () => {
    if (!newUrl) return;
    setFetchingPreview(true);
    await new Promise((r) => setTimeout(r, 700));
    try {
      const domain = new URL(newUrl).hostname.replace("www.", "");
      setPreview({ title: domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1) + " — Reference", domain });
    } catch {
      setPreview(null);
    }
    setFetchingPreview(false);
  };

  const handleAddItem = () => {
    if (!newUrl.trim()) return;
    let domain = newUrl;
    try { domain = new URL(newUrl).hostname.replace("www.", ""); } catch {}
    const imgSeed = Math.random().toString(36).slice(2, 8);
    addItem({
      url: newUrl,
      title: preview?.title || `Reference from ${domain}`,
      source_domain: preview?.domain || domain,
      category: newCategory,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      note: newNote,
      color: `https://picsum.photos/seed/${imgSeed}/600/500`,
    });
    setShowModal(false);
    setNewUrl("");
    setNewCategory("graphic_design");
    setNewTags("");
    setNewNote("");
    setPreview(null);
  };

  return (
    <ShellLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[42px] font-semibold tracking-tight leading-tight" style={{ color: "var(--color-primary-ink)" }}>
            Moodboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            {items.length} references collected
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add Reference
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-7" style={{ borderBottom: "1px solid var(--color-hairline)", paddingBottom: 0 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-semibold rounded-t-[10px] transition-all duration-150 -mb-px",
              activeCategory === cat
                ? "border-b-2 border-[#2A9D8F]"
                : "hover:opacity-70"
            )}
            style={{
              background: activeCategory === cat ? "var(--color-primary-light)" : "transparent",
              color: activeCategory === cat ? "#1C4F4F" : "var(--color-muted)",
            }}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Masonry grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--color-muted-soft)" }}>
          <p className="text-sm font-medium">No references in this category yet.</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
          <AnimatePresence>
            {filtered.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, delay: idx * 0.04 }}
                className="break-inside-avoid mb-4 rounded-[14px] overflow-hidden group relative border"
                style={{ borderColor: "var(--color-hairline)" }}
              >
                {/* Image */}
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.color.startsWith("http") ? item.color : PLACEHOLDER_IMAGES[idx % PLACEHOLDER_IMAGES.length]}
                    alt={item.title}
                    className="w-full object-cover block"
                    style={{ minHeight: 140 + (idx % 3) * 60 }}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
                  {/* Action buttons on hover */}
                  <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white shadow-sm transition-colors"
                    >
                      <ExternalLink size={12} className="text-[#3D5159]" />
                    </a>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-red-50 shadow-sm transition-colors"
                    >
                      <Trash2 size={12} className="text-[#C64545]" />
                    </button>
                  </div>
                </div>

                {/* Card info */}
                <div className="p-3" style={{ background: "var(--color-surface)" }}>
                  <p className="text-[13px] font-semibold leading-tight mb-1 line-clamp-1" style={{ color: "var(--color-ink)" }}>
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                      {item.source_domain}
                    </span>
                    <Badge variant={categoryBadge[item.category]}>
                      {categoryShort[item.category]}
                    </Badge>
                  </div>
                  {item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Reference Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-[20px] shadow-2xl overflow-hidden"
              style={{ background: "var(--color-surface)" }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-5" style={{ borderBottom: "1px solid var(--color-hairline)" }}>
                <div>
                  <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-ink)" }}>Add Reference</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Paste a URL to add to your board</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70"
                  style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-5">
                {/* URL preview */}
                {(fetchingPreview || preview) && (
                  <div
                    className="h-16 rounded-[10px] flex items-center justify-center"
                    style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)" }}
                  >
                    {fetchingPreview ? (
                      <div className="flex items-center gap-2">
                        <Loader2 size={16} className="text-[#2A9D8F] animate-spin" />
                        <span className="text-xs" style={{ color: "var(--color-muted)" }}>Fetching preview…</span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>{preview?.title}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{preview?.domain}</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label>Link URL</Label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    placeholder="https://dribbble.com/shots/..."
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MoodCategory)}
                    className="w-full rounded-[8px] px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-[#2A9D8F]/25 focus:border-[#2A9D8F]"
                    style={{
                      background: "var(--color-surface-card)",
                      border: "1px solid var(--color-hairline)",
                      color: "var(--color-ink)",
                    }}
                  >
                    <option value="graphic_design">Graphic Design</option>
                    <option value="product_design">Product Design</option>
                    <option value="3d">3D</option>
                    <option value="motion">Motion</option>
                  </select>
                </div>

                <div>
                  <Label>Tags (optional, comma separated)</Label>
                  <Input
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="typography, branding, minimal"
                  />
                </div>

                <div>
                  <Label>Note (optional)</Label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={2}
                    placeholder="What do you like about this?"
                    className="w-full rounded-[8px] px-3 py-2.5 text-sm outline-none transition-all resize-none focus:ring-2 focus:ring-[#2A9D8F]/25"
                    style={{
                      background: "var(--color-surface-card)",
                      border: "1px solid var(--color-hairline)",
                      color: "var(--color-ink)",
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleAddItem}>
                    Add to Board
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ShellLayout>
  );
}
