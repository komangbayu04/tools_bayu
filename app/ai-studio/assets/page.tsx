"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAssetStore, type AssetType } from "@/lib/aiStore";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const TYPE_META: Record<AssetType, { label: string; icon: Parameters<typeof Icon>[0]["name"]; tint: string }> = {
  image: { label: "Image", icon: "image", tint: "#6D8DF0" },
  video: { label: "Video", icon: "play", tint: "#C77DD6" },
  text: { label: "Text", icon: "file-text", tint: "#5DB872" },
  audio: { label: "Audio", icon: "circle-dot", tint: "#E8A55A" },
};

const TYPES: AssetType[] = ["image", "video", "text", "audio"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
      {children}
    </label>
  );
}

export default function AssetsLibraryPage() {
  const { assets, addAsset, deleteAsset } = useAssetStore();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AssetType>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add dialog
  const [showAdd, setShowAdd] = useState(false);
  const [aTitle, setATitle] = useState("");
  const [aType, setAType] = useState<AssetType>("image");
  const [aUrl, setAUrl] = useState("");
  const [aPrompt, setAPrompt] = useState("");
  const [aModel, setAModel] = useState("");
  const [aTags, setATags] = useState("");

  const reset = () => { setATitle(""); setAType("image"); setAUrl(""); setAPrompt(""); setAModel(""); setATags(""); };

  const handleAdd = () => {
    if (!aTitle.trim()) return;
    addAsset({
      title: aTitle.trim(),
      type: aType,
      url: aUrl.trim(),
      prompt: aPrompt.trim(),
      model: aModel.trim() || "—",
      tags: aTags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    reset();
    setShowAdd(false);
  };

  const copyPrompt = (id: string, prompt: string) => {
    navigator.clipboard?.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  };

  const filtered = assets.filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    const q = search.toLowerCase();
    return !q || a.title.toLowerCase().includes(q) || a.prompt.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q));
  });

  return (
    <ShellLayout>
      <PageHeader
        eyebrow="AI Studio"
        title="AI Assets Library"
        subtitle="Simpan & kelola semua aset hasil AI dalam satu tempat"
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={15} /> Tambah Aset
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon name="search" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted-soft)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aset, prompt, tag..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none border"
            style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)", color: "var(--color-ink)" }}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", ...TYPES] as const).map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className="px-3 py-2 rounded-xl text-[12px] font-semibold transition-colors capitalize"
                style={active
                  ? { background: "var(--color-primary)", color: "var(--color-on-primary)" }
                  : { background: "var(--color-surface-card)", color: "var(--color-muted)", border: "1px solid var(--color-hairline)" }}
              >
                {t === "all" ? "Semua" : TYPE_META[t].label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--color-primary-light)" }}>
            <Icon name="layers" size={22} style={{ color: "var(--color-primary-ink)" }} />
          </div>
          <p className="text-[15px] font-semibold" style={{ color: "var(--color-ink)" }}>Belum ada aset</p>
          <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>Tambahkan aset AI pertamamu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((asset) => {
              const meta = TYPE_META[asset.type];
              return (
                <motion.div
                  key={asset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.15 }}
                  className="group rounded-[16px] overflow-hidden border flex flex-col"
                  style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}
                >
                  {/* Preview */}
                  <div className="relative aspect-[4/3] overflow-hidden" style={{ background: "var(--color-canvas)" }}>
                    {asset.type === "image" && asset.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center"
                          style={{ background: `color-mix(in srgb, ${meta.tint} 16%, transparent)` }}
                        >
                          <Icon name={meta.icon} size={26} style={{ color: meta.tint }} />
                        </div>
                      </div>
                    )}
                    <span
                      className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "color-mix(in srgb, var(--color-surface) 85%, transparent)", color: meta.tint }}
                    >
                      <Icon name={meta.icon} size={9} /> {meta.label}
                    </span>
                    <button
                      onClick={() => { if (confirm(`Hapus aset "${asset.title}"?`)) deleteAsset(asset.id); }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "color-mix(in srgb, var(--color-surface) 85%, transparent)", color: "#C64545" }}
                      aria-label="Hapus"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-3.5 flex flex-col flex-1">
                    <p className="text-[14px] font-semibold leading-snug" style={{ color: "var(--color-ink)" }}>{asset.title}</p>
                    {asset.prompt && (
                      <p className="text-[12px] mt-1 line-clamp-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                        {asset.prompt}
                      </p>
                    )}
                    {asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {asset.tags.map((t) => (
                          <span key={t} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "var(--color-canvas)", color: "var(--color-muted)" }}>#{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-3">
                      <span className="text-[11px]" style={{ color: "var(--color-muted-soft)" }}>
                        {asset.model} · {format(new Date(asset.createdAt), "d MMM", { locale: idLocale })}
                      </span>
                      {asset.prompt && (
                        <button
                          onClick={() => copyPrompt(asset.id, asset.prompt)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors"
                          style={{ color: copiedId === asset.id ? "#5DB872" : "var(--color-primary-ink)" }}
                        >
                          <Icon name={copiedId === asset.id ? "check" : "copy"} size={11} />
                          {copiedId === asset.id ? "Tersalin" : "Prompt"}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Asset Dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Aset</DialogTitle>
            <DialogDescription>Simpan aset hasil AI ke library</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <FieldLabel>Judul</FieldLabel>
              <Input autoFocus value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="Nama aset" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Tipe</FieldLabel>
                <Select value={aType} onChange={(e) => setAType(e.target.value as AssetType)}>
                  {TYPES.map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>Model</FieldLabel>
                <Input value={aModel} onChange={(e) => setAModel(e.target.value)} placeholder="cth. Image Gen" />
              </div>
            </div>
            {(aType === "image" || aType === "video") && (
              <div>
                <FieldLabel>URL {aType === "image" ? "Gambar" : "Video"} (opsional)</FieldLabel>
                <Input value={aUrl} onChange={(e) => setAUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}
            <div>
              <FieldLabel>Prompt</FieldLabel>
              <Textarea rows={3} value={aPrompt} onChange={(e) => setAPrompt(e.target.value)} placeholder="Prompt yang dipakai untuk membuat aset ini…" />
            </div>
            <div>
              <FieldLabel>Tags (pisah dengan koma)</FieldLabel>
              <Input value={aTags} onChange={(e) => setATags(e.target.value)} placeholder="background, gradient" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => { setShowAdd(false); reset(); }}>Batal</Button>
              <Button onClick={handleAdd} disabled={!aTitle.trim()}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}
