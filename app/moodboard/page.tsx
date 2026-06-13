"use client";

import { useState } from "react";
import { ShellLayout } from "@/components/shell/Layout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Plus, ExternalLink, Search } from "lucide-react";

type Category = "All" | "Graphic Design" | "Product Design" | "3D" | "Motion";

interface MoodCard {
  id: number;
  title: string;
  domain: string;
  category: Exclude<Category, "All">;
  tags: string[];
  note: string;
  color: string;
  height: number;
  url: string;
}

const badgeVariantMap: Record<Exclude<Category, "All">, "graphic" | "product" | "3d" | "motion"> = {
  "Graphic Design": "graphic",
  "Product Design": "product",
  "3D": "3d",
  "Motion": "motion",
};

const sampleCards: MoodCard[] = [
  { id: 1, title: "Brutalist Typography Poster", domain: "awwwards.com", category: "Graphic Design", tags: ["typography", "brutalism"], note: "Love the contrast", color: "#1A1A2E", height: 240, url: "#" },
  { id: 2, title: "Glass Morphism UI Kit", domain: "dribbble.com", category: "Product Design", tags: ["glassmorphism", "UI"], note: "", color: "#6C63FF", height: 180, url: "#" },
  { id: 3, title: "Surreal 3D Landscape", domain: "behance.net", category: "3D", tags: ["3d", "surreal"], note: "Color palette reference", color: "#2D6A4F", height: 300, url: "#" },
  { id: 4, title: "Fluid Motion Reel", domain: "vimeo.com", category: "Motion", tags: ["motion", "fluid"], note: "Timing inspiration", color: "#E76F51", height: 200, url: "#" },
  { id: 5, title: "Swiss Grid System", domain: "typewolf.com", category: "Graphic Design", tags: ["grid", "swiss"], note: "", color: "#264653", height: 220, url: "#" },
  { id: 6, title: "Spatial UI Concept", domain: "dribbble.com", category: "Product Design", tags: ["spatial", "AR"], note: "Apple Vision vibes", color: "#457B9D", height: 260, url: "#" },
  { id: 7, title: "Isometric City Builder", domain: "artstation.com", category: "3D", tags: ["isometric", "city"], note: "", color: "#A8DADC", height: 190, url: "#" },
  { id: 8, title: "Kinetic Typography Animation", domain: "motionographer.com", category: "Motion", tags: ["kinetic", "type"], note: "Font pairing ref", color: "#E9C46A", height: 230, url: "#" },
  { id: 9, title: "Noise Texture Branding", domain: "behance.net", category: "Graphic Design", tags: ["texture", "noise"], note: "", color: "#8338EC", height: 200, url: "#" },
  { id: 10, title: "Minimal App Dashboard", domain: "figma.com", category: "Product Design", tags: ["minimal", "dashboard"], note: "Reference for layout", color: "#3A86FF", height: 250, url: "#" },
  { id: 11, title: "Abstract Blob Sculpture", domain: "artstation.com", category: "3D", tags: ["abstract", "sculpt"], note: "", color: "#FF006E", height: 280, url: "#" },
  { id: 12, title: "Particle Flow Opener", domain: "vimeo.com", category: "Motion", tags: ["particles", "flow"], note: "Opener inspiration", color: "#FB5607", height: 210, url: "#" },
];

const categories: Category[] = ["All", "Graphic Design", "Product Design", "3D", "Motion"];

export default function MoodboardPage() {
  const [cards, setCards] = useState<MoodCard[]>(sampleCards);
  const [activeFilter, setActiveFilter] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Exclude<Category, "All">>("Graphic Design");
  const [newTags, setNewTags] = useState("");
  const [newNote, setNewNote] = useState("");

  const filtered = cards.filter((c) => {
    const matchCat = activeFilter === "All" || c.category === activeFilter;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.domain.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  // Distribute into 4 columns for masonry
  const columns: MoodCard[][] = [[], [], [], []];
  filtered.forEach((card, i) => columns[i % 4].push(card));

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const domain = newUrl
      ? (() => {
          try { return new URL(newUrl).hostname.replace("www.", ""); }
          catch { return "link"; }
        })()
      : "manual";
    setCards((cs) => [
      {
        id: Date.now(),
        title: newTitle,
        domain,
        category: newCategory,
        tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
        note: newNote,
        color: ["#6C63FF", "#2A9D8F", "#E76F51", "#264653", "#E9C46A"][Math.floor(Math.random() * 5)],
        height: 180 + Math.floor(Math.random() * 120),
        url: newUrl || "#",
      },
      ...cs,
    ]);
    setNewUrl(""); setNewTitle(""); setNewTags(""); setNewNote("");
    setAddOpen(false);
  };

  return (
    <ShellLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[52px] font-semibold text-[#1C4F4F] tracking-tight leading-tight">
            Moodboard
          </h1>
          <p className="text-[#7A9099] mt-1">{cards.length} references saved</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          Add Reference
        </Button>
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center bg-[#F4F6F7] rounded-xl p-1 gap-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                activeFilter === cat
                  ? "bg-[#E0F0F0] text-[#1C4F4F]"
                  : "text-[#7A9099] hover:text-[#3D5159]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8BDC3]" />
          <input
            className="pl-9 pr-3 py-2 text-sm rounded-xl border border-[#E5E9EB] bg-white outline-none focus:border-[#2A9D8F] text-[#1A2B32] placeholder:text-[#A8BDC3] w-48"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Masonry Grid */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center text-[#A8BDC3]">
          <p className="text-sm">No references found</p>
        </div>
      ) : (
        <div className="flex gap-4 items-start">
          {columns.map((col, ci) => (
            <div key={ci} className="flex-1 flex flex-col gap-4">
              {col.map((card) => (
                <div
                  key={card.id}
                  className="rounded-2xl overflow-hidden border border-[#E5E9EB] bg-white shadow-sm hover:shadow-md transition-shadow group"
                >
                  {/* Color thumbnail */}
                  <div
                    className="relative w-full flex items-end p-3"
                    style={{ height: card.height * 0.6, backgroundColor: card.color }}
                  >
                    <a
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto w-7 h-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                    >
                      <ExternalLink size={13} className="text-white" />
                    </a>
                  </div>
                  {/* Card info */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-[#1A2B32] mb-1 leading-snug">{card.title}</p>
                    <p className="text-xs text-[#A8BDC3] mb-2">{card.domain}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={badgeVariantMap[card.category]}>
                        {card.category}
                      </Badge>
                      {card.tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-[#7A9099] bg-[#F4F6F7] px-1.5 py-0.5 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {card.note && (
                      <p className="text-xs text-[#7A9099] mt-2 italic border-t border-[#F4F6F7] pt-2">
                        {card.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add Reference Modal */}
      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Reference" description="Save a design reference to your moodboard.">
        <div className="space-y-4">
          <Input
            label="URL"
            placeholder="https://dribbble.com/…"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <Input
            label="Title"
            placeholder="Give it a name"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div>
            <label className="text-sm font-semibold text-[#3D5159] block mb-1">Category</label>
            <select
              className="w-full rounded-xl border border-[#E5E9EB] bg-white px-3 py-2 text-sm text-[#1A2B32] outline-none focus:border-[#2A9D8F]"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as Exclude<Category, "All">)}
            >
              <option>Graphic Design</option>
              <option>Product Design</option>
              <option>3D</option>
              <option>Motion</option>
            </select>
          </div>
          <Input
            label="Tags (comma-separated)"
            placeholder="typography, brutalism, minimal"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
          />
          <div>
            <label className="text-sm font-semibold text-[#3D5159] block mb-1">Note</label>
            <textarea
              className="w-full rounded-xl border border-[#E5E9EB] bg-white px-3 py-2 text-sm text-[#1A2B32] placeholder:text-[#A8BDC3] outline-none focus:border-[#2A9D8F] resize-none"
              rows={2}
              placeholder="What caught your eye?"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" size="md" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md" className="flex-1" onClick={handleAdd}>Save Reference</Button>
          </div>
        </div>
      </Modal>
    </ShellLayout>
  );
}
