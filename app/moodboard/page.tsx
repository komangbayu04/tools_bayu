"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useState } from "react";
import { Plus, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { useMoodStore, type MoodCategory } from "@/lib/store";
import { resolveCover, randomGradient } from "@/lib/utils";
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
      const name = domain.split(".")[0];
      setPreview({ title: name.charAt(0).toUpperCase() + name.slice(1) + " — Reference", domain });
    } catch { setPreview(null); }
    setFetchingPreview(false);
  };

  const resetForm = () => {
    setNewUrl(""); setNewCategory("graphic_design"); setNewTags(""); setNewNote(""); setPreview(null);
  };

  const handleAddItem = () => {
    if (!newUrl.trim()) return;
    let domain = newUrl;
    try { domain = new URL(newUrl).hostname.replace("www.", ""); } catch {}
    addItem({
      url: newUrl,
      title: preview?.title || `Reference from ${domain}`,
      source_domain: preview?.domain || domain,
      category: newCategory,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      note: newNote,
      color: randomGradient(),
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

      {/* Masonry grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-sm font-medium" style={{ color: "var(--color-muted-soft)" }}>No references in this category yet.</p>
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
                transition={{ duration: 0.18, delay: idx * 0.03 }}
                className="break-inside-avoid mb-4 rounded-[14px] overflow-hidden group relative border"
                style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}
              >
                <div className="relative overflow-hidden">
                  <div
                    className="w-full transition-transform duration-300 group-hover:scale-105"
                    style={{ minHeight: 150 + (idx % 3) * 50, background: resolveCover(item.color, item.id) }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-200" />
                  <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white shadow-sm transition-colors">
                      <ExternalLink size={12} className="text-[#3D5159]" />
                    </a>
                    <button onClick={() => deleteItem(item.id)} className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-red-50 shadow-sm transition-colors">
                      <Trash2 size={12} className="text-[#C64545]" />
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-[13px] font-semibold leading-tight mb-1 line-clamp-1" style={{ color: "var(--color-ink)" }}>{item.title}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>{item.source_domain}</span>
                    <Badge variant={categoryBadge[item.category]}>{categoryShort[item.category]}</Badge>
                  </div>
                  {item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Reference Dialog */}
      <Dialog open={showModal} onOpenChange={(o) => { setShowModal(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reference</DialogTitle>
            <DialogDescription>Paste a URL to add to your board</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-5">
            {(fetchingPreview || preview) && (
              <div className="h-16 rounded-[10px] flex items-center justify-center" style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)" }}>
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
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Link URL</label>
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onBlur={handleUrlBlur} placeholder="https://dribbble.com/shots/..." />
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
              <Button className="flex-1" onClick={handleAddItem}>Add to Board</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}
