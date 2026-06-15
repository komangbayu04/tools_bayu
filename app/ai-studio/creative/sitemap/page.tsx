"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useSitemapStore, type SitemapPage } from "@/lib/aiStore";

// ─── Templates ────────────────────────────────────────────────────
// Each site type scaffolds a full set of pages with their sections,
// the same way Relume turns a prompt into a starter sitemap.
type SiteType = {
  id: string;
  label: string;
  icon: IconName;
  description: string;
  pages: { name: string; sections: string[] }[];
};

const SITE_TYPES: SiteType[] = [
  {
    id: "saas",
    label: "SaaS / Startup",
    icon: "robot",
    description: "Produk software dengan halaman fitur & pricing",
    pages: [
      { name: "Home", sections: ["Navbar", "Hero", "Logo Cloud", "Features", "How It Works", "Benefits", "Testimonials", "Pricing", "FAQ", "CTA", "Footer"] },
      { name: "Features", sections: ["Navbar", "Hero", "Feature Grid", "Feature Detail", "Integrations", "CTA", "Footer"] },
      { name: "Pricing", sections: ["Navbar", "Pricing Tiers", "Comparison Table", "FAQ", "CTA", "Footer"] },
      { name: "About", sections: ["Navbar", "Hero", "Story", "Team", "Values", "CTA", "Footer"] },
      { name: "Blog", sections: ["Navbar", "Blog Header", "Post Grid", "Newsletter", "Footer"] },
      { name: "Contact", sections: ["Navbar", "Contact Form", "Map", "Footer"] },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: "image",
    description: "Showcase karya personal atau freelancer",
    pages: [
      { name: "Home", sections: ["Navbar", "Hero", "Selected Work", "About Preview", "Services", "Testimonials", "Contact CTA", "Footer"] },
      { name: "About", sections: ["Navbar", "Bio", "Skills", "Experience", "CTA", "Footer"] },
      { name: "Projects", sections: ["Navbar", "Filter", "Project Grid", "Footer"] },
      { name: "Services", sections: ["Navbar", "Services List", "Process", "Pricing", "CTA", "Footer"] },
      { name: "Contact", sections: ["Navbar", "Contact Form", "Socials", "Footer"] },
    ],
  },
  {
    id: "agency",
    label: "Agency",
    icon: "building",
    description: "Studio atau agensi kreatif",
    pages: [
      { name: "Home", sections: ["Navbar", "Hero", "Logo Cloud", "Services", "Case Studies", "Process", "Testimonials", "Team", "CTA", "Footer"] },
      { name: "Services", sections: ["Navbar", "Services Detail", "Process", "Pricing", "CTA", "Footer"] },
      { name: "Work", sections: ["Navbar", "Filter", "Case Study Grid", "CTA", "Footer"] },
      { name: "About", sections: ["Navbar", "Story", "Team", "Values", "Careers", "Footer"] },
      { name: "Contact", sections: ["Navbar", "Contact Form", "Office Info", "Footer"] },
    ],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    icon: "receipt",
    description: "Toko online dengan katalog produk",
    pages: [
      { name: "Home", sections: ["Navbar", "Hero", "Featured Categories", "Best Sellers", "Promo Banner", "Testimonials", "Newsletter", "Footer"] },
      { name: "Shop", sections: ["Navbar", "Filters", "Product Grid", "Pagination", "Footer"] },
      { name: "Product", sections: ["Navbar", "Product Gallery", "Product Info", "Reviews", "Related Products", "Footer"] },
      { name: "Cart", sections: ["Navbar", "Cart Items", "Order Summary", "Footer"] },
      { name: "Checkout", sections: ["Navbar", "Checkout Form", "Order Summary", "Footer"] },
      { name: "About", sections: ["Navbar", "Story", "Values", "Footer"] },
    ],
  },
  {
    id: "blog",
    label: "Blog / Media",
    icon: "file-text",
    description: "Website konten & artikel",
    pages: [
      { name: "Home", sections: ["Navbar", "Hero", "Featured Posts", "Post Grid", "Categories", "Newsletter", "Footer"] },
      { name: "Article", sections: ["Navbar", "Article Header", "Article Body", "Author Bio", "Related Posts", "Comments", "Footer"] },
      { name: "Categories", sections: ["Navbar", "Category List", "Post Grid", "Footer"] },
      { name: "About", sections: ["Navbar", "Bio", "Contact CTA", "Footer"] },
    ],
  },
  {
    id: "landing",
    label: "Landing Page",
    icon: "lightbulb",
    description: "Satu halaman fokus konversi",
    pages: [
      { name: "Landing Page", sections: ["Navbar", "Hero", "Logo Cloud", "Features", "Benefits", "How It Works", "Testimonials", "Pricing", "FAQ", "CTA", "Footer"] },
    ],
  },
];

// Suggestions surfaced in the "add section" datalist.
const SECTION_LIBRARY = [
  "Navbar", "Hero", "Logo Cloud", "Features", "Feature Grid", "Benefits",
  "How It Works", "Stats", "Testimonials", "Pricing", "Comparison Table",
  "FAQ", "CTA", "Team", "Gallery", "Blog Posts", "Newsletter", "Contact Form",
  "Reviews", "Related Products", "Footer",
];

const buildPages = (type: SiteType): SitemapPage[] =>
  type.pages.map((p) => ({
    id: crypto.randomUUID(),
    name: p.name,
    sections: p.sections.map((name) => ({ id: crypto.randomUUID(), name })),
  }));

const sitemapToText = (name: string, pages: SitemapPage[]) => {
  const lines = [name, ""];
  pages.forEach((p) => {
    lines.push(p.name);
    p.sections.forEach((sec) => lines.push(`  - ${sec.name}`));
    lines.push("");
  });
  return lines.join("\n").trim();
};

export default function SitemapGeneratorPage() {
  const {
    sitemaps, addSitemap, renameSitemap, deleteSitemap,
    addPage, renamePage, deletePage,
    addSection, renameSection, deleteSection, moveSection,
  } = useSitemapStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("");
  const [selectedType, setSelectedType] = useState<string>("saas");
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  const [newPageDraft, setNewPageDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const active = sitemaps.find((s) => s.id === activeId) ?? null;

  const handleGenerate = () => {
    const type = SITE_TYPES.find((t) => t.id === selectedType)!;
    const name = siteName.trim() || `${type.label} Website`;
    const id = addSitemap(name, buildPages(type));
    setActiveId(id);
    setSiteName("");
  };

  const handleCopy = () => {
    if (!active) return;
    navigator.clipboard.writeText(sitemapToText(active.name, active.pages)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const inputBase = "rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 transition";
  const inputStyle = {
    background: "var(--color-surface)",
    borderColor: "var(--color-hairline)",
    color: "var(--color-body)",
  };

  // ─── EDITOR VIEW ─────────────────────────────────────────────────
  if (active) {
    const totalSections = active.pages.reduce((n, p) => n + p.sections.length, 0);
    return (
      <ShellLayout>
        <PageHeader
          eyebrow="Creative Generator"
          title="Sitemap Generator"
          subtitle="Susun struktur website-mu halaman demi halaman"
          actions={
            <>
              <Button variant="outline" onClick={() => setActiveId(null)}>
                <Icon name="arrow-left" size={14} /> Semua Sitemap
              </Button>
              <Button variant="outline" onClick={handleCopy}>
                <Icon name={copied ? "check" : "copy"} size={14} /> {copied ? "Tersalin" : "Salin"}
              </Button>
            </>
          }
        />

        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-3 rounded-2xl border p-4 mb-6"
          style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
        >
          <input
            value={active.name}
            onChange={(e) => renameSitemap(active.id, e.target.value)}
            className={`${inputBase} flex-1 min-w-[200px] font-semibold text-[15px]`}
            style={inputStyle}
          />
          <span className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>
            {active.pages.length} halaman · {totalSections} section
          </span>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              deleteSitemap(active.id);
              setActiveId(null);
            }}
          >
            <Icon name="trash" size={13} /> Hapus
          </Button>
        </div>

        {/* Canvas */}
        <div className="flex flex-wrap gap-4 items-start">
          <AnimatePresence>
            {active.pages.map((page, pi) => (
              <motion.div
                key={page.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="w-[260px] rounded-2xl border overflow-hidden flex flex-col"
                style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
              >
                {/* Page header */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5"
                  style={{ background: "var(--color-primary-light)" }}
                >
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
                  >
                    {pi + 1}
                  </span>
                  <input
                    value={page.name}
                    onChange={(e) => renamePage(active.id, page.id, e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-[14px] font-bold outline-none"
                    style={{ color: "var(--color-primary-ink)" }}
                  />
                  <button
                    onClick={() => deletePage(active.id, page.id)}
                    className="p-1 rounded-md hover:bg-black/5 flex-shrink-0"
                    style={{ color: "var(--color-primary-ink)" }}
                    aria-label="Hapus halaman"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>

                {/* Sections */}
                <div className="flex flex-col gap-1.5 p-3">
                  {page.sections.map((sec, si) => (
                    <div
                      key={sec.id}
                      className="group flex items-center gap-1.5 rounded-lg border px-2 py-1.5"
                      style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}
                    >
                      <Icon name="grip" size={11} style={{ color: "var(--color-muted-soft)" }} />
                      <input
                        value={sec.name}
                        onChange={(e) => renameSection(active.id, page.id, sec.id, e.target.value)}
                        className="flex-1 min-w-0 bg-transparent text-[12.5px] font-medium outline-none"
                        style={{ color: "var(--color-body)" }}
                      />
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveSection(active.id, page.id, sec.id, -1)}
                          disabled={si === 0}
                          className="p-0.5 disabled:opacity-30"
                          style={{ color: "var(--color-muted-soft)" }}
                          aria-label="Naik"
                        >
                          <Icon name="chevron-down" size={11} style={{ transform: "rotate(180deg)" }} />
                        </button>
                        <button
                          onClick={() => moveSection(active.id, page.id, sec.id, 1)}
                          disabled={si === page.sections.length - 1}
                          className="p-0.5 disabled:opacity-30"
                          style={{ color: "var(--color-muted-soft)" }}
                          aria-label="Turun"
                        >
                          <Icon name="chevron-down" size={11} />
                        </button>
                        <button
                          onClick={() => deleteSection(active.id, page.id, sec.id)}
                          className="p-0.5"
                          style={{ color: "var(--color-muted-soft)" }}
                          aria-label="Hapus section"
                        >
                          <Icon name="trash" size={11} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add section */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = (sectionDrafts[page.id] ?? "").trim();
                      if (!val) return;
                      addSection(active.id, page.id, val);
                      setSectionDrafts((d) => ({ ...d, [page.id]: "" }));
                    }}
                    className="flex items-center gap-1.5 mt-1"
                  >
                    <input
                      list="section-suggestions"
                      placeholder="Tambah section…"
                      value={sectionDrafts[page.id] ?? ""}
                      onChange={(e) => setSectionDrafts((d) => ({ ...d, [page.id]: e.target.value }))}
                      className={`${inputBase} flex-1 min-w-0 py-1.5`}
                      style={inputStyle}
                    />
                    <button
                      type="submit"
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
                      aria-label="Tambah section"
                    >
                      <Icon name="plus" size={12} />
                    </button>
                  </form>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add page card */}
          <div
            className="w-[260px] rounded-2xl border border-dashed p-4 flex flex-col gap-3"
            style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}
          >
            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>
              Tambah Halaman
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const val = newPageDraft.trim();
                if (!val) return;
                addPage(active.id, val);
                setNewPageDraft("");
              }}
              className="flex flex-col gap-2"
            >
              <input
                placeholder="Nama halaman"
                value={newPageDraft}
                onChange={(e) => setNewPageDraft(e.target.value)}
                className={inputBase}
                style={inputStyle}
              />
              <Button type="submit" size="sm" className="w-full">
                <Icon name="plus" size={13} /> Tambah halaman
              </Button>
            </form>
          </div>
        </div>

        <datalist id="section-suggestions">
          {SECTION_LIBRARY.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </ShellLayout>
    );
  }

  // ─── HUB / GENERATOR VIEW ────────────────────────────────────────
  return (
    <ShellLayout>
      <PageHeader
        eyebrow="Creative Generator"
        title="Sitemap Generator"
        subtitle="Hasilkan struktur website lengkap dari satu pilihan — lalu sesuaikan."
        actions={
          <Link href="/ai-studio/creative">
            <Button variant="outline">
              <Icon name="arrow-left" size={14} /> Creative Generator
            </Button>
          </Link>
        }
      />

      {/* Generator */}
      <div
        className="rounded-[20px] border p-6 mb-8"
        style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
      >
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>
          Nama Website / Proyek
        </label>
        <input
          placeholder="mis. Studio Kamarupa"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className={`${inputBase} w-full mb-6`}
          style={inputStyle}
        />

        <label className="block text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted-soft)" }}>
          Tipe Website
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {SITE_TYPES.map((type) => {
            const selected = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className="text-left rounded-2xl border p-4 transition"
                style={{
                  borderColor: selected ? "var(--color-primary)" : "var(--color-hairline)",
                  background: selected ? "var(--color-primary-light)" : "var(--color-surface)",
                  boxShadow: selected ? "0 0 0 1px var(--color-primary)" : "none",
                }}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: selected ? "var(--color-primary)" : "var(--color-canvas)" }}
                  >
                    <Icon
                      name={type.icon}
                      size={16}
                      style={{ color: selected ? "var(--color-on-primary)" : "var(--color-muted)" }}
                    />
                  </div>
                  <span className="text-[14px] font-bold" style={{ color: "var(--color-ink)" }}>
                    {type.label}
                  </span>
                </div>
                <p className="text-[12px] leading-snug" style={{ color: "var(--color-muted)" }}>
                  {type.description}
                </p>
                <p className="text-[11px] mt-2 font-medium" style={{ color: "var(--color-muted-soft)" }}>
                  {type.pages.length} halaman ditambahkan
                </p>
              </button>
            );
          })}
        </div>

        <Button onClick={handleGenerate} size="lg">
          <Icon name="sparkles" size={16} /> Generate Sitemap
        </Button>
      </div>

      {/* Saved sitemaps */}
      {sitemaps.length > 0 && (
        <div>
          <h2 className="text-[16px] font-bold tracking-tight mb-4" style={{ color: "var(--color-ink)" }}>
            Sitemap Tersimpan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sitemaps.map((sm) => {
              const totalSections = sm.pages.reduce((n, p) => n + p.sections.length, 0);
              return (
                <div
                  key={sm.id}
                  className="group rounded-2xl border p-4 flex flex-col"
                  style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold truncate" style={{ color: "var(--color-ink)" }}>
                        {sm.name}
                      </h3>
                      <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                        {sm.pages.length} halaman · {totalSections} section
                      </p>
                    </div>
                    <button
                      onClick={() => deleteSitemap(sm.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      style={{ color: "var(--color-muted-soft)" }}
                      aria-label="Hapus sitemap"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {sm.pages.slice(0, 5).map((p) => (
                      <span
                        key={p.id}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}
                      >
                        {p.name}
                      </span>
                    ))}
                    {sm.pages.length > 5 && (
                      <span className="text-[11px] font-medium px-2 py-0.5" style={{ color: "var(--color-muted-soft)" }}>
                        +{sm.pages.length - 5}
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="mt-auto w-full" onClick={() => setActiveId(sm.id)}>
                    <Icon name="edit" size={13} /> Buka & edit
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ShellLayout>
  );
}
