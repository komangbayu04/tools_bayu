"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { useState } from "react";
import { Plus, X, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Category = "all" | "graphic_design" | "product_design" | "3d" | "motion";

interface MoodItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  image_url?: string;
  source_domain: string;
  category: Exclude<Category, "all">;
  tags: string[];
  note?: string;
  color: string; // fallback bg color
}

const categoryLabels: Record<Category, string> = {
  all: "All",
  graphic_design: "Graphic Design",
  product_design: "Product Design",
  "3d": "3D",
  motion: "Motion",
};

const categoryShort: Record<Exclude<Category, "all">, string> = {
  graphic_design: "GD",
  product_design: "PD",
  "3d": "3D",
  motion: "MO",
};

const sampleColors = ["#E0F0F0", "#F4E8D8", "#DDE8F5", "#F0E0F0", "#E0F0E8", "#FDE8D8", "#E8E0F5", "#D8F0F4"];

const initialItems: MoodItem[] = [
  { id: "1", url: "https://dribbble.com", title: "Minimal Brand Identity System", source_domain: "dribbble.com", category: "graphic_design", tags: ["branding", "minimal"], color: "#E0F0F0", note: "Love the whitespace handling" },
  { id: "2", url: "https://behance.net", title: "Product UI Design Case Study", source_domain: "behance.net", category: "product_design", tags: ["ui", "case study"], color: "#DDE8F5" },
  { id: "3", url: "https://are.na", title: "Brutalist Web Design Collection", source_domain: "are.na", category: "graphic_design", tags: ["brutalism", "web"], color: "#F4E8D8" },
  { id: "4", url: "https://vimeo.com", title: "Motion Graphics Showreel 2025", source_domain: "vimeo.com", category: "motion", tags: ["motion", "showreel"], color: "#F0E0F0" },
  { id: "5", url: "https://awwwards.com", title: "Experimental 3D Typography", source_domain: "awwwards.com", category: "3d", tags: ["3d", "typography"], color: "#E0F0E8" },
  { id: "6", url: "https://pinterest.com", title: "Packaging Design Inspiration", source_domain: "pinterest.com", category: "graphic_design", tags: ["packaging"], color: "#FDE8D8" },
  { id: "7", url: "https://behance.net", title: "Dark Mode App Design System", source_domain: "behance.net", category: "product_design", tags: ["dark mode", "design system"], color: "#E8E0F5" },
  { id: "8", url: "https://motionographer.com", title: "Title Sequence Animation", source_domain: "motionographer.com", category: "motion", tags: ["title", "film"], color: "#D8F0F4" },
];

// Staggered heights for masonry feel
const cardHeights = ["h-48", "h-64", "h-52", "h-56", "h-60", "h-44", "h-72", "h-52"];

export default function MoodboardPage() {
  const [items, setItems] = useState<MoodItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [showModal, setShowModal] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<Exclude<Category, "all">>("graphic_design");
  const [newTags, setNewTags] = useState("");
  const [newNote, setNewNote] = useState("");
  const [preview, setPreview] = useState<{ title?: string; domain?: string } | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);

  const filtered = activeCategory === "all" ? items : items.filter((i) => i.category === activeCategory);

  const deleteItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const handleUrlBlur = async () => {
    if (!newUrl) return;
    setFetchingPreview(true);
    await new Promise((r) => setTimeout(r, 800));
    try {
      const domain = new URL(newUrl).hostname.replace("www.", "");
      setPreview({ title: `Preview from ${domain}`, domain });
    } catch {
      setPreview(null);
    }
    setFetchingPreview(false);
  };

  const addItem = () => {
    if (!newUrl.trim()) return;
    let domain = newUrl;
    try { domain = new URL(newUrl).hostname.replace("www.", ""); } catch {}
    setItems((prev) => [{
      id: crypto.randomUUID(),
      url: newUrl,
      title: preview?.title || domain,
      source_domain: preview?.domain || domain,
      category: newCategory,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      note: newNote,
      color: sampleColors[Math.floor(Math.random() * sampleColors.length)],
    }, ...prev]);
    setShowModal(false);
    setNewUrl("");
    setNewCategory("graphic_design");
    setNewTags("");
    setNewNote("");
    setPreview(null);
  };

  const categories: Category[] = ["all", "graphic_design", "product_design", "3d", "motion"];

  return (
    <ShellLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[42px] font-semibold text-[#1C4F4F] tracking-tight leading-tight">Moodboard</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#2A9D8F] text-white text-sm font-medium hover:bg-[#1E7268] transition-colors"
        >
          <Plus size={15} /> Add Reference
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0 mb-6 border-b border-[#E5E9EB]">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              "px-5 py-2.5 text-sm font-semibold rounded-t-[10px] transition-colors",
              activeCategory === cat
                ? "bg-[#E0F0F0] text-[#1C4F4F]"
                : "text-[#7A9099] hover:text-[#3D5159]"
            )}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Masonry grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#A8BDC3]">
          <p className="text-sm font-medium">No references in this category</p>
        </div>
      ) : (
        <div className="columns-4 gap-4 space-y-4">
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              className={clsx("break-inside-avoid rounded-[14px] overflow-hidden border border-[#E5E9EB] group relative", cardHeights[idx % cardHeights.length])}
              style={{ backgroundColor: item.color }}
            >
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-[14px]" />
              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors">
                  <ExternalLink size={12} className="text-[#3D5159]" />
                </a>
                <button onClick={() => deleteItem(item.id)} className="p-1.5 bg-white/90 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={12} className="text-[#C64545]" />
                </button>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/30 to-transparent">
                <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-white/70 text-[10px]">{item.source_domain}</span>
                  <span className="text-[10px] font-bold text-white/80 bg-white/20 rounded px-1.5 py-0.5">
                    {categoryShort[item.category]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Reference Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E5E9EB]">
              <h2 className="text-[16px] font-semibold text-[#1C4F4F]">Add Reference</h2>
              <button onClick={() => setShowModal(false)} className="text-[#A8BDC3] hover:text-[#3D5159]"><X size={18} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Preview thumbnail */}
              {(fetchingPreview || preview) && (
                <div className="h-20 rounded-[10px] bg-[#E0F0F0] flex items-center justify-center">
                  {fetchingPreview ? (
                    <Loader2 size={18} className="text-[#2A9D8F] animate-spin" />
                  ) : (
                    <div className="text-center">
                      <p className="text-xs font-semibold text-[#1C4F4F]">{preview?.title}</p>
                      <p className="text-[10px] text-[#7A9099]">{preview?.domain}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Link URL</label>
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder="https://dribbble.com/shots/..."
                  className="w-full bg-[#F9FAFB] border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as Exclude<Category, "all">)}
                  className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30"
                >
                  <option value="graphic_design">Graphic Design</option>
                  <option value="product_design">Product Design</option>
                  <option value="3d">3D</option>
                  <option value="motion">Motion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Tags (optional, comma separated)</label>
                <input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="typography, branding, minimal"
                  className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Note (optional)</label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  placeholder="What do you like about this?"
                  className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-[#E5E9EB] text-sm font-medium text-[#3D5159] rounded-[10px] hover:bg-[#F4F6F7] transition-colors">
                  Cancel
                </button>
                <button onClick={addItem} className="flex-1 py-2.5 bg-[#2A9D8F] text-white rounded-[10px] text-sm font-medium hover:bg-[#1E7268] transition-colors">
                  Add to Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ShellLayout>
  );
}
