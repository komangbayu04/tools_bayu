"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useSitemapStore, type SitemapPage, type SitemapSection } from "@/lib/aiStore";

// ─── Section description library ─────────────────────────────────
// Pre-filled descriptions so sections feel "smart" right after generate.
const DESC: Record<string, string> = {
  Navbar: "Logo, navigasi utama, dan CTA button.",
  Hero: "Headline utama, sub-headline, CTA primer & sekunder, visual hero.",
  "Logo Cloud": "Grid logo klien atau partner untuk membangun kredibilitas.",
  Features: "Grid atau list fitur unggulan dengan ikon dan deskripsi singkat.",
  "Feature Grid": "Tampilkan fitur dalam grid visual yang mudah dibaca.",
  "Feature Detail": "Penjelasan mendalam satu fitur dengan screenshot atau demo.",
  "How It Works": "Langkah-langkah cara kerja produk dalam 3–4 tahap.",
  Benefits: "Manfaat nyata yang dirasakan pengguna, bukan sekadar fitur.",
  Testimonials: "Kutipan dari pengguna nyata dengan foto, nama, dan jabatan.",
  "Pricing Tiers": "Kartu harga dengan perbandingan fitur per paket.",
  "Comparison Table": "Tabel perbandingan detail paket atau kompetitor.",
  FAQ: "Jawaban untuk pertanyaan paling sering diajukan.",
  CTA: "Section penutup dengan ajakan tindakan yang kuat.",
  Team: "Foto, nama, dan jabatan anggota tim inti.",
  Story: "Latar belakang perusahaan dan kenapa produk ini dibuat.",
  Values: "Nilai-nilai inti yang menjadi fondasi kerja tim.",
  Integrations: "Daftar integrasi dengan tools populer.",
  "Blog Header": "Judul halaman blog, filter kategori, dan search.",
  "Post Grid": "Grid artikel dengan thumbnail, judul, dan excerpt.",
  Newsletter: "Form subscribe email untuk update konten terbaru.",
  "Contact Form": "Form kontak dengan field nama, email, dan pesan.",
  Map: "Peta lokasi kantor atau area layanan.",
  Bio: "Foto, nama, dan narasi singkat tentang dirimu.",
  Skills: "Daftar keahlian teknis dan soft skill.",
  Experience: "Timeline pengalaman kerja dan pendidikan.",
  "Selected Work": "3–6 karya terbaik sebagai highlight utama.",
  "About Preview": "Teaser singkat tentang kamu dengan link ke halaman About.",
  Services: "List layanan yang ditawarkan beserta deskripsi singkat.",
  "Project Grid": "Grid semua proyek dengan filter dan hover detail.",
  "Services List": "Detail setiap layanan dengan proses dan deliverable.",
  Process: "Tahapan cara kamu bekerja dari discovery hingga delivery.",
  Socials: "Link ke media sosial dan platform profesional.",
  "Case Studies": "Preview proyek unggulan dengan konteks, solusi, dan hasil.",
  "Case Study Grid": "Grid semua case study yang bisa difilter.",
  Careers: "Posisi yang sedang dibuka dan kultur kerja.",
  "Featured Categories": "Highlight kategori produk utama dengan visual.",
  "Best Sellers": "Grid produk terlaris dengan harga dan rating.",
  "Promo Banner": "Banner promosi waktu terbatas atau penawaran spesial.",
  "Product Gallery": "Foto produk multi-angle yang bisa di-zoom.",
  "Product Info": "Nama, harga, varian, dan tombol Add to Cart.",
  Reviews: "Rating bintang dan ulasan terverifikasi dari pembeli.",
  "Related Products": "Rekomendasi produk serupa di bawah detail produk.",
  "Cart Items": "Daftar item di keranjang dengan jumlah dan subtotal.",
  "Order Summary": "Ringkasan pesanan, ongkos kirim, dan total.",
  "Checkout Form": "Form pengiriman dan metode pembayaran.",
  Filter: "Opsi filter dan sort untuk memudahkan pencarian.",
  "Featured Posts": "Artikel pilihan yang disorot di halaman utama.",
  "Article Header": "Judul, penulis, tanggal terbit, dan estimasi baca.",
  "Article Body": "Konten artikel dengan tipografi yang nyaman dibaca.",
  "Author Bio": "Foto dan deskripsi singkat penulis artikel.",
  "Related Posts": "3 artikel yang relevan di akhir konten.",
  Comments: "Kolom komentar dan diskusi pembaca.",
  "Category List": "Semua kategori konten dengan jumlah artikel.",
  Footer: "Link navigasi, media sosial, dan info hak cipta.",
  "Contact CTA": "Tombol atau prompt untuk mengundang pengunjung menghubungi.",
  Stats: "Angka-angka kunci yang membuktikan kredibilitas.",
  Gallery: "Grid foto atau visual proyek dalam format masonry.",
  "Promo Banner (secondary)": "Banner promosi sekunder di tengah halaman.",
  "Hero Section": "Headline, deskripsi, dan CTA utama halaman.",
  "Landing Page": "Satu halaman panjang yang fokus mengkonversi pengunjung.",
};

const getDesc = (name: string) => DESC[name] ?? "";

// ─── Site type templates ──────────────────────────────────────────
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
      { name: "Home", sections: ["Navbar", "Hero", "Logo Cloud", "Features", "How It Works", "Benefits", "Testimonials", "Pricing Tiers", "FAQ", "CTA", "Footer"] },
      { name: "Features", sections: ["Navbar", "Hero", "Feature Grid", "Feature Detail", "Integrations", "CTA", "Footer"] },
      { name: "Pricing", sections: ["Navbar", "Pricing Tiers", "Comparison Table", "FAQ", "CTA", "Footer"] },
      { name: "About", sections: ["Navbar", "Story", "Team", "Values", "CTA", "Footer"] },
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
      { name: "Services", sections: ["Navbar", "Services List", "Process", "Pricing Tiers", "CTA", "Footer"] },
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
      { name: "Services", sections: ["Navbar", "Services List", "Process", "Pricing Tiers", "CTA", "Footer"] },
      { name: "Work", sections: ["Navbar", "Filter", "Case Study Grid", "CTA", "Footer"] },
      { name: "About", sections: ["Navbar", "Story", "Team", "Values", "Careers", "Footer"] },
      { name: "Contact", sections: ["Navbar", "Contact Form", "Map", "Footer"] },
    ],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    icon: "receipt",
    description: "Toko online dengan katalog produk",
    pages: [
      { name: "Home", sections: ["Navbar", "Hero", "Featured Categories", "Best Sellers", "Promo Banner", "Testimonials", "Newsletter", "Footer"] },
      { name: "Shop", sections: ["Navbar", "Filter", "Product Grid", "Footer"] },
      { name: "Product", sections: ["Navbar", "Product Gallery", "Product Info", "Reviews", "Related Products", "Footer"] },
      { name: "Cart", sections: ["Navbar", "Cart Items", "Order Summary", "Footer"] },
      { name: "Checkout", sections: ["Navbar", "Checkout Form", "Order Summary", "Footer"] },
    ],
  },
  {
    id: "blog",
    label: "Blog / Media",
    icon: "file-text",
    description: "Website konten & artikel",
    pages: [
      { name: "Home", sections: ["Navbar", "Hero", "Featured Posts", "Post Grid", "Newsletter", "Footer"] },
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
      { name: "Landing Page", sections: ["Navbar", "Hero", "Logo Cloud", "Features", "Benefits", "How It Works", "Testimonials", "Pricing Tiers", "FAQ", "CTA", "Footer"] },
    ],
  },
];

const buildPages = (type: SiteType): SitemapPage[] =>
  type.pages.map((p) => ({
    id: crypto.randomUUID(),
    name: p.name,
    sections: p.sections.map((name) => ({ id: crypto.randomUUID(), name, description: getDesc(name) })),
  }));

// ─── Section card ─────────────────────────────────────────────────
function SectionCard({
  sec,
  idx,
  total,
  sitemapId,
  pageId,
}: {
  sec: SitemapSection;
  idx: number;
  total: number;
  sitemapId: string;
  pageId: string;
}) {
  const { updateSection, deleteSection, moveSection } = useSitemapStore();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-xl border"
      style={{
        borderColor: "var(--color-hairline)",
        background: "var(--color-canvas)",
      }}
    >
      {/* Action bar — appears on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute -top-3 right-2 flex items-center gap-0.5 rounded-lg border px-1 py-0.5 z-10"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-hairline)" }}
          >
            <button
              onClick={() => moveSection(sitemapId, pageId, sec.id, -1)}
              disabled={idx === 0}
              className="w-5 h-5 flex items-center justify-center rounded disabled:opacity-20 hover:bg-[var(--color-canvas)]"
              style={{ color: "var(--color-muted-soft)" }}
              aria-label="Naik"
            >
              <Icon name="chevron-down" size={10} style={{ transform: "rotate(180deg)" }} />
            </button>
            <button
              onClick={() => moveSection(sitemapId, pageId, sec.id, 1)}
              disabled={idx === total - 1}
              className="w-5 h-5 flex items-center justify-center rounded disabled:opacity-20 hover:bg-[var(--color-canvas)]"
              style={{ color: "var(--color-muted-soft)" }}
              aria-label="Turun"
            >
              <Icon name="chevron-down" size={10} />
            </button>
            <div className="w-px h-3 mx-0.5" style={{ background: "var(--color-hairline)" }} />
            <button
              onClick={() => deleteSection(sitemapId, pageId, sec.id)}
              className="w-5 h-5 flex items-center justify-center rounded hover:text-red-500 hover:bg-red-50"
              style={{ color: "var(--color-muted-soft)" }}
              aria-label="Hapus"
            >
              <Icon name="trash" size={10} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3">
        <input
          value={sec.name}
          onChange={(e) => updateSection(sitemapId, pageId, sec.id, { name: e.target.value })}
          className="w-full bg-transparent text-[13px] font-semibold outline-none"
          style={{ color: "var(--color-ink)" }}
          placeholder="Section name"
        />
        <textarea
          value={sec.description}
          onChange={(e) => updateSection(sitemapId, pageId, sec.id, { description: e.target.value })}
          className="w-full bg-transparent text-[11.5px] leading-relaxed resize-none outline-none mt-0.5"
          style={{ color: "var(--color-muted)" }}
          placeholder="Deskripsi section…"
          rows={sec.description ? Math.max(2, Math.ceil(sec.description.length / 36)) : 1}
        />
      </div>
    </motion.div>
  );
}

// ─── Page column ──────────────────────────────────────────────────
function PageColumn({
  page,
  pageIdx,
  sitemapId,
}: {
  page: SitemapPage;
  pageIdx: number;
  sitemapId: string;
}) {
  const { renamePage, deletePage, addSection } = useSitemapStore();
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col items-center" style={{ minWidth: 220, maxWidth: 260, flex: "0 0 240px" }}>
      {/* Connector from root */}
      <div className="w-px h-8 flex-shrink-0" style={{ background: "var(--color-hairline)" }} />

      {/* Page node */}
      <div
        className="group w-full rounded-[14px] border overflow-hidden"
        style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
      >
        {/* Page header */}
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ background: "var(--color-primary-light)", borderBottom: "1px solid var(--color-hairline)" }}
        >
          <span
            className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            {pageIdx + 1}
          </span>
          <input
            value={page.name}
            onChange={(e) => renamePage(sitemapId, page.id, e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-[13px] font-bold outline-none"
            style={{ color: "var(--color-primary-ink)" }}
          />
          <button
            onClick={() => deletePage(sitemapId, page.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10"
            style={{ color: "var(--color-primary-ink)" }}
            aria-label="Hapus halaman"
          >
            <Icon name="x" size={11} />
          </button>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-2 p-2.5">
          <AnimatePresence>
            {page.sections.map((sec, si) => (
              <SectionCard
                key={sec.id}
                sec={sec}
                idx={si}
                total={page.sections.length}
                sitemapId={sitemapId}
                pageId={page.id}
              />
            ))}
          </AnimatePresence>

          {/* Add section */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = draft.trim();
              if (!val) return;
              addSection(sitemapId, page.id, val, getDesc(val));
              setDraft("");
            }}
            className="flex items-center gap-1.5 mt-1"
          >
            <input
              list="section-suggestions"
              placeholder="+ Section"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border px-2.5 py-1.5 text-[12px] outline-none focus:ring-1"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-hairline)",
                color: "var(--color-body)",
              }}
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
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function SitemapGeneratorPage() {
  const {
    sitemaps, addSitemap, renameSitemap, deleteSitemap,
    addPage,
  } = useSitemapStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("");
  const [selectedType, setSelectedType] = useState<string>("saas");
  const [newPageDraft, setNewPageDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  // AI generation state
  const [genMode, setGenMode] = useState<"template" | "ai">("template");
  const [aiDesc, setAiDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiGenerate = async () => {
    if (!aiDesc.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/sitemap-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiDesc }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiError(data.error ?? "Terjadi kesalahan.");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = data.result as { name: string; pages: { name: string; sections: { name: string; description: string }[] }[]; rationale?: string };
      const pages: SitemapPage[] = result.pages.map((p) => ({
        id: crypto.randomUUID(),
        name: p.name,
        sections: p.sections.map((s) => ({ id: crypto.randomUUID(), name: s.name, description: s.description })),
      }));
      const id = addSitemap(result.name, pages);
      setActiveId(id);
      setAiDesc("");
    } catch {
      setAiError("Koneksi gagal. Coba lagi.");
    } finally {
      setAiLoading(false);
    }
  };

  const ZOOM_MIN = 0.4;
  const ZOOM_MAX = 1.5;
  const zoomBy = (delta: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)));

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
    const lines = [active.name, ""];
    active.pages.forEach((p) => {
      lines.push(p.name);
      p.sections.forEach((s) => lines.push(`  - ${s.name}${s.description ? `: ${s.description}` : ""}`));
      lines.push("");
    });
    navigator.clipboard.writeText(lines.join("\n").trim()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const inputStyle = {
    background: "var(--color-surface)",
    borderColor: "var(--color-hairline)",
    color: "var(--color-body)",
  };
  const inputBase = "rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2";

  // ── CANVAS / EDITOR ───────────────────────────────────────────────
  if (active) {
    const totalSections = active.pages.reduce((n, p) => n + p.sections.length, 0);
    return (
      <ShellLayout>
        <PageHeader
          eyebrow="Creative Generator"
          title="Sitemap Generator"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setActiveId(null)}>
                <Icon name="arrow-left" size={13} /> Semua Sitemap
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Icon name={copied ? "check" : "copy"} size={13} />
                {copied ? "Tersalin!" : "Salin"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { deleteSitemap(active.id); setActiveId(null); }}
              >
                <Icon name="trash" size={13} /> Hapus
              </Button>
            </div>
          }
        />

        {/* Canvas wrapper — distinct dotted background, scrollable + zoomable */}
        <div className="relative rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-hairline)" }}>
          <div
            ref={canvasRef}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                zoomBy(e.deltaY < 0 ? 0.1 : -0.1);
              }
            }}
            className="overflow-auto"
            style={{
              minHeight: "72vh",
              maxHeight: "calc(100vh - 220px)",
              background: "var(--color-canvas)",
              backgroundImage: "radial-gradient(var(--color-hairline) 1.1px, transparent 1.1px)",
              backgroundSize: "22px 22px",
            }}
          >
            <div
              className="inline-flex flex-col items-center px-12 pt-10"
              style={{
                minWidth: "max-content",
                paddingBottom: 96,
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 120ms ease-out",
              }}
            >

            {/* Root / Project node */}
            <div
              className="flex items-center gap-3 rounded-[14px] border px-5 py-3"
              style={{
                background: "var(--color-surface-card)",
                borderColor: "var(--color-hairline)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-primary)" }}
              >
                <Icon name="workflow" size={14} style={{ color: "var(--color-on-primary)" }} />
              </div>
              <div>
                <input
                  value={active.name}
                  onChange={(e) => renameSitemap(active.id, e.target.value)}
                  className="bg-transparent text-[15px] font-bold outline-none tracking-tight"
                  style={{ color: "var(--color-ink)", minWidth: 180 }}
                />
                <p className="text-[11px]" style={{ color: "var(--color-muted-soft)" }}>
                  {active.pages.length} halaman · {totalSections} section
                </p>
              </div>
            </div>

            {/* Horizontal connector to pages */}
            <div className="relative flex items-start">
              {/* Vertical stem down from root */}
              <div
                className="absolute left-1/2 top-0 w-px"
                style={{ height: 28, background: "var(--color-hairline)", transform: "translateX(-50%)" }}
              />
              {/* Horizontal bar across all page columns */}
              {active.pages.length > 1 && (
                <div
                  className="absolute"
                  style={{
                    top: 28,
                    left: "calc(120px)",
                    right: "calc(120px)",
                    height: 1,
                    background: "var(--color-hairline)",
                  }}
                />
              )}
            </div>

            {/* Pages row */}
            <div className="flex items-start gap-5 mt-0 pt-0">
              <AnimatePresence>
                {active.pages.map((page, pi) => (
                  <motion.div
                    key={page.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                  >
                    <PageColumn page={page} pageIdx={pi} sitemapId={active.id} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add new page column */}
              <div className="flex flex-col items-center" style={{ minWidth: 180 }}>
                <div className="w-px h-8" style={{ background: "var(--color-hairline)" }} />
                <div
                  className="w-full rounded-[14px] border border-dashed p-4 flex flex-col gap-2"
                  style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-center mb-1" style={{ color: "var(--color-muted-soft)" }}>
                    + Halaman Baru
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
                      className={`${inputBase} w-full`}
                      style={inputStyle}
                    />
                    <Button type="submit" size="sm" className="w-full">
                      <Icon name="plus" size={12} /> Tambah
                    </Button>
                  </form>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Floating zoom control */}
          <div
            className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border px-1.5 py-1 z-20"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-hairline)", boxShadow: "var(--shadow-pop)" }}
          >
            <button
              onClick={() => zoomBy(-0.1)}
              disabled={zoom <= ZOOM_MIN}
              className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-[var(--color-canvas)]"
              style={{ color: "var(--color-body)" }}
              aria-label="Zoom out"
            >
              <Icon name="minus" size={14} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="min-w-[48px] text-center text-[12px] font-semibold tabular-nums hover:bg-[var(--color-canvas)] rounded-lg py-1"
              style={{ color: "var(--color-body)" }}
              aria-label="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => zoomBy(0.1)}
              disabled={zoom >= ZOOM_MAX}
              className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-[var(--color-canvas)]"
              style={{ color: "var(--color-body)" }}
              aria-label="Zoom in"
            >
              <Icon name="plus" size={14} />
            </button>
          </div>
        </div>

        <datalist id="section-suggestions">
          {Object.keys(DESC).map((name) => <option key={name} value={name} />)}
        </datalist>
      </ShellLayout>
    );
  }

  // ── HUB / GENERATOR VIEW ─────────────────────────────────────────
  return (
    <ShellLayout>
      <PageHeader
        eyebrow="Creative Generator"
        title="Sitemap Generator"
        subtitle="Hasilkan struktur website lengkap dengan sections — siap dari satu pilihan, lalu tweak di canvas."
        actions={
          <Link href="/ai-studio/creative">
            <Button variant="outline">
              <Icon name="arrow-left" size={14} /> Creative Generator
            </Button>
          </Link>
        }
      />

      {/* Generator card */}
      <div
        className="rounded-[20px] border mb-8 overflow-hidden"
        style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
      >
        {/* Mode tabs */}
        <div className="flex border-b" style={{ borderColor: "var(--color-hairline)" }}>
          {[
            { id: "template", label: "Dari Template", icon: "layout-grid" },
            { id: "ai", label: "Generate dengan AI", icon: "sparkles" },
          ].map((tab) => {
            const active = genMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setGenMode(tab.id as "template" | "ai"); setAiError(null); }}
                className="flex items-center gap-2 px-5 py-3.5 text-[13px] font-semibold transition border-b-2"
                style={{
                  borderColor: active ? "var(--color-primary)" : "transparent",
                  color: active ? "var(--color-primary-ink)" : "var(--color-muted)",
                  background: active ? "var(--color-primary-light)" : "transparent",
                }}
              >
                <Icon name={tab.icon as IconName} size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {genMode === "template" ? (
            <>
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
                          <Icon name={type.icon} size={16} style={{ color: selected ? "var(--color-on-primary)" : "var(--color-muted)" }} />
                        </div>
                        <span className="text-[14px] font-bold" style={{ color: "var(--color-ink)" }}>{type.label}</span>
                      </div>
                      <p className="text-[12px] leading-snug" style={{ color: "var(--color-muted)" }}>{type.description}</p>
                      <p className="text-[11px] mt-2 font-medium" style={{ color: "var(--color-muted-soft)" }}>
                        {type.pages.length} halaman
                      </p>
                    </button>
                  );
                })}
              </div>

              <Button onClick={handleGenerate} size="lg">
                <Icon name="layout-grid" size={16} /> Generate dari Template
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 mb-4 rounded-xl px-4 py-3" style={{ background: "var(--color-primary-light)" }}>
                <Icon name="sparkles" size={14} style={{ color: "var(--color-primary-ink)", flexShrink: 0, marginTop: 2 }} />
                <p className="text-[13px]" style={{ color: "var(--color-primary-ink)" }}>
                  Deskripsikan website kamu — bisnis, target audience, fitur utama. GPT-4o akan membuat struktur halaman dan sections yang paling sesuai.
                </p>
              </div>

              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-soft)" }}>
                Deskripsi Website / Bisnis
              </label>
              <textarea
                placeholder={`Contoh:\n"Saya punya klinik kecantikan di Bali yang menawarkan perawatan kulit, laser, dan body treatment. Target klien wanita 25-45 tahun. Saya ingin website yang elegan dan bisa booking online."`}
                value={aiDesc}
                onChange={(e) => setAiDesc(e.target.value)}
                rows={5}
                className={`${inputBase} w-full mb-4 resize-none`}
                style={inputStyle}
              />

              {aiError && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-4" style={{ background: "#fef2f2" }}>
                  <Icon name="alert-triangle" size={13} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
                  <p className="text-[13px]" style={{ color: "#991b1b" }}>{aiError}</p>
                </div>
              )}

              <Button onClick={handleAiGenerate} disabled={!aiDesc.trim() || aiLoading} size="lg">
                {aiLoading ? (
                  <><Icon name="spinner" size={16} spin /> AI sedang membuat sitemap…</>
                ) : (
                  <><Icon name="sparkles" size={16} /> Generate dengan AI</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Saved sitemaps */}
      {sitemaps.length > 0 && (
        <div>
          <h2 className="text-[16px] font-bold tracking-tight mb-4" style={{ color: "var(--color-ink)" }}>
            Sitemap Tersimpan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sitemaps.map((sm) => {
              const totalSec = sm.pages.reduce((n, p) => n + p.sections.length, 0);
              return (
                <div
                  key={sm.id}
                  className="group rounded-2xl border p-4 flex flex-col"
                  style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold truncate" style={{ color: "var(--color-ink)" }}>{sm.name}</h3>
                      <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                        {sm.pages.length} halaman · {totalSec} section
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
                      <span key={p.id} className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}>
                        {p.name}
                      </span>
                    ))}
                    {sm.pages.length > 5 && (
                      <span className="text-[11px] px-2 py-0.5" style={{ color: "var(--color-muted-soft)" }}>+{sm.pages.length - 5}</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="mt-auto w-full" onClick={() => setActiveId(sm.id)}>
                    <Icon name="edit" size={13} /> Buka Canvas
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
