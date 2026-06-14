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

// Varying heights for mosaic feel
const mosaicHeights = [220, 300, 260, 340, 200, 280, 320, 240, 180, 310, 260, 200];

export default function MoodboardPage() {
  const { items, addItem, deleteItem } = useMoodStore();
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [showModal, setShowModal] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<MoodCategory>("graphic_design");
  const [newTags, setNewTags] = useState("");
  const [newNote, setNewNote] = useState("");
  const [preview, setPreview] = useState<{ title?: string; domain?: string; image_url?: string } | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);

  const filtered = activeCategory === "all" ? items : items.filter((i) => i.category === activeCategory);
  const categories: Category[] = ["all", "graphic_design", "product_design", "3d", "motion"];

  type PreviewData = { title?: string; domain?: string; image_url?: string };

  // Fetch OG metadata + image via Microlink. Returns the resolved preview.
  const fetchPreview = async (url: string): Promise<PreviewData> => {
    let domain = url;
    try { domain = new URL(url).hostname.replace("www.", ""); } catch {}
    const fallbackTitle = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1) + " — Reference";
    try {
      const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&palette=false&audio=false&video=false`);
      const json = await res.json();
      // Prefer the page OG image; fall back to a Microlink-proxied screenshot.
      let image_url: string | undefined = json?.data?.image?.url || json?.data?.logo?.url;
      if (!image_url && json?.status === "success") {
        // Proxy a screenshot through Microlink so even hotlink-protected pages render.
        image_url = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`;
      }
      return { title: json?.data?.title || fallbackTitle, domain, image_url };
    } catch {
      return { title: fallbackTitle, domain };
    }
  };

  const handleUrlBlur = async () => {
    if (!newUrl.trim()) return;
    setFetchingPreview(true);
    setPreview(await fetchPreview(newUrl));
    setFetchingPreview(false);
  };

  const resetForm = () => {
    setNewUrl(""); setNewCategory("graphic_design"); setNewTags(""); setNewNote(""); setPreview(null);
  };

  const handleAddItem = async () => {
    if (!newUrl.trim()) return;
    // Ensure we have the image even if the user clicked Add before blur finished.
    let data = preview;
    if (!data || !data.image_url) {
      setFetchingPreview(true);
      data = await fetchPreview(newUrl);
      setFetchingPreview(false);
    }
    let domain = newUrl;
    try { domain = new URL(newUrl).hostname.replace("www.", ""); } catch {}
    addItem({
      url: newUrl,
      title: data?.title || `Reference from ${domain}`,
      source_domain: data?.domain || domain,
      category: newCategory,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      note: newNote,
      color: randomGradient(),
      image_url: data?.image_url,
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
                  {/* Image or gradient background */}
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ background: resolveCover(item.color, item.id) }}
                      onError={(e) => {
                        // Hide broken image; gradient background shows through.
                        e.currentTarget.style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                      style={{ background: resolveCover(item.color, item.id) }}
                    />
                  )}

                  {/* Hover overlay with info */}
                  <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)" }}
                  >
                    <div className="p-3 pb-3.5">
                      <p className="text-[13px] font-semibold leading-tight text-white line-clamp-2 mb-1">{item.title}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-white/70 truncate">{item.source_domain}</span>
                        <Badge variant={categoryBadge[item.category]}>{categoryShort[item.category]}</Badge>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white shadow-sm transition-colors">
                        <ExternalLink size={12} className="text-[#3D5159]" />
                      </a>
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
            <DialogDescription>Paste a URL to add to your board</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-5">
            {/* Image preview */}
            {(fetchingPreview || preview) && (
              <div
                className="h-40 rounded-[10px] overflow-hidden flex items-center justify-center"
                style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)" }}
              >
                {fetchingPreview ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="text-[#2A9D8F] animate-spin" />
                    <span className="text-xs" style={{ color: "var(--color-muted)" }}>Fetching preview…</span>
                  </div>
                ) : preview?.image_url ? (
                  <img src={preview.image_url} alt={preview.title} className="w-full h-full object-cover" />
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
