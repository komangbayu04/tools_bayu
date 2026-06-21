"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useRef, useState, useMemo, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { useMoodStore, type MoodCategory, type MediaType } from "@/lib/store";
import { uploadMedia } from "@/lib/supabase";
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
  all: "All time", today: "Today", week: "This week", month: "This month",
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const startOf = (unit: "today" | "week" | "month") => {
  const now = new Date();
  if (unit === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (unit === "week") { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d.getTime(); }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
};

// null = Global (no project)
type ActiveFolder = null | string;

// Pick up to 4 cover images from items in a folder for the tile preview
function folderCovers(items: { projectId?: string; image_url?: string; color: string; id: string }[], projectId: string | null) {
  return items
    .filter(i => projectId === null ? !i.projectId : i.projectId === projectId)
    .slice(0, 4);
}

export default function MoodboardPage() {
  const { items, projects, addItem, deleteItem, moveItem, addProject, renameProject, deleteProject } = useMoodStore();

  // ── Folder state ──
  const [activeFolder, setActiveFolder] = useState<ActiveFolder>(null);
  const [showFolderPanel, setShowFolderPanel] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);

  // ── Filter state ──
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showDateMenu, setShowDateMenu] = useState(false);

  // ── Move-to-project state ──
  const [moveMenuItemId, setMoveMenuItemId] = useState<string | null>(null);

  // ── Dialogs ──
  const [showModal, setShowModal] = useState(false);
  const [lightbox, setLightbox] = useState<typeof items[0] | null>(null);

  // ── Add form ──
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<MoodCategory>("graphic_design");
  const [newTags, setNewTags] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newProjectId, setNewProjectId] = useState<string>("__global__");
  const [mediaData, setMediaData] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [mediaName, setMediaName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Filtered items ──
  const filtered = useMemo(() => {
    let list = items.filter(i =>
      activeFolder === null ? !i.projectId : i.projectId === activeFolder
    );
    if (activeCategory !== "all") list = list.filter(i => i.category === activeCategory);
    if (dateFilter !== "all") {
      const since = startOf(dateFilter);
      list = list.filter(i => (i.createdAt ?? 0) >= since);
    }
    return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [items, activeFolder, activeCategory, dateFilter]);

  const globalCount = items.filter(i => !i.projectId).length;
  const categories: Category[] = ["all", "graphic_design", "product_design", "3d", "motion"];

  // ── Label for the active folder shown below the filter bar ──
  const activeFolderName = activeFolder === null
    ? null
    : (projects.find(p => p.id === activeFolder)?.name ?? "Folder");

  // ── File handling ──
  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return;
    const dataUrl = await readFileAsDataUrl(file);
    setMediaData(dataUrl);
    setMediaFile(file);
    setMediaType(isVideo ? "video" : "image");
    setMediaName(file.name);
    if (!newTitle) setNewTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const resetForm = () => {
    setNewTitle(""); setNewUrl(""); setNewCategory("graphic_design");
    setNewTags(""); setNewNote(""); setMediaData(null); setMediaFile(null);
    setMediaType(null); setMediaName("");
    setNewProjectId(activeFolder ?? "__global__");
  };

  const openAddModal = () => {
    setNewProjectId(activeFolder ?? "__global__");
    setShowModal(true);
  };

  // ── Add item ──
  const handleAddItem = async () => {
    if (!mediaData || saving) return;
    setSaving(true);
    try {
      let domain = "";
      if (newUrl) { try { domain = new URL(newUrl).hostname.replace("www.", ""); } catch { domain = newUrl; } }
      let imageUrl = mediaData;
      if (mediaFile) {
        const uploaded = await uploadMedia(mediaFile);
        if (uploaded) imageUrl = uploaded;
      }
      addItem({
        url: newUrl,
        title: newTitle.trim() || "Untitled reference",
        source_domain: domain,
        category: newCategory,
        tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
        note: newNote,
        color: "linear-gradient(135deg,#6ba539,#2e4d1b)",
        image_url: imageUrl,
        media_type: mediaType ?? "image",
        createdAt: Date.now(),
        projectId: newProjectId === "__global__" ? undefined : newProjectId,
      });
      setShowModal(false);
      resetForm();
    } catch (e) {
      console.error("[moodboard] gagal menyimpan item:", e);
    } finally {
      setSaving(false);
    }
  };

  // ── Paste from clipboard (Figma export, image file, web image, image URL) ──
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  useEffect(() => {
    // Add one reference from a file.
    const addPastedFile = async (file: File, title?: string) => {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await uploadMedia(file);
      addItem({
        url: "", title: title || "Pasted reference", source_domain: "",
        category: activeCategory === "all" ? "graphic_design" : activeCategory,
        tags: [], note: "", color: "linear-gradient(135deg,#6ba539,#2e4d1b)",
        image_url: uploaded || dataUrl,
        media_type: file.type.startsWith("video/") ? "video" : "image",
        createdAt: Date.now(), projectId: activeFolder ?? undefined,
      });
    };

    // Add one reference from a URL.
    const addPastedUrl = async (url: string) => {
      let imageUrl = url, domain = "";
      try { domain = new URL(url).hostname.replace("www.", ""); } catch {}
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        if (blob.type.startsWith("image/")) {
          const file = new File([blob], `pasted-${Date.now()}.png`, { type: blob.type });
          const uploaded = await uploadMedia(file);
          imageUrl = uploaded || (await readFileAsDataUrl(file));
        }
      } catch { /* CORS/fetch fail — use URL directly */ }
      addItem({
        url: "", title: "Pasted reference", source_domain: domain,
        category: activeCategory === "all" ? "graphic_design" : activeCategory,
        tags: [], note: "", color: "linear-gradient(135deg,#6ba539,#2e4d1b)",
        image_url: imageUrl, media_type: "image",
        createdAt: Date.now(), projectId: activeFolder ?? undefined,
      });
    };

    const onPaste = async (e: ClipboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement | null)?.isContentEditable) return;
      if (showModal) return;

      const dt = e.clipboardData;
      if (!dt) return;
      const itemsArr = Array.from(dt.items ?? []);

      // 1) Raw image/video bytes — collect ALL, not just the first.
      const fileItems = itemsArr.filter((i) => i.kind === "file" && (i.type.startsWith("image/") || i.type.startsWith("video/")));
      const files = fileItems.map((i) => i.getAsFile()).filter((f): f is File => !!f);
      // Also check dt.files (populated when copying files from the OS).
      const dtFiles = Array.from(dt.files ?? []).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
      // Merge, deduplicate by name+size.
      const seen = new Set<string>();
      const allFiles: File[] = [];
      for (const f of [...files, ...dtFiles]) {
        const key = `${f.name}-${f.size}`;
        if (!seen.has(key)) { seen.add(key); allFiles.push(f); }
      }
      if (allFiles.length > 0) {
        e.preventDefault();
        setPasteToast(`Menempelkan ${allFiles.length} gambar…`);
        await Promise.all(allFiles.map((f) => addPastedFile(f, f.name.replace(/\.[^.]+$/, ""))));
        setPasteToast(null);
        return;
      }

      // 2) HTML with one or more <img src> tags.
      const html = dt.getData("text/html");
      if (html) {
        const srcs = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)).map((m) => m[1]);
        if (srcs.length > 0) {
          e.preventDefault();
          setPasteToast(`Menempelkan ${srcs.length} gambar…`);
          await Promise.all(srcs.map(addPastedUrl));
          setPasteToast(null);
          return;
        }
      }

      // 3) Plain text — one URL or multiple lines of image URLs.
      const text = dt.getData("text/plain").trim();
      const imgUrlRe = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif)(\?\S*)?$/i;
      const urls = text.split(/\s+/).filter((u) => imgUrlRe.test(u));
      if (urls.length > 0) {
        e.preventDefault();
        setPasteToast(`Menempelkan ${urls.length} gambar…`);
        await Promise.all(urls.map(addPastedUrl));
        setPasteToast(null);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder, activeCategory, showModal]);

  // ── Folder actions ──
  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    addProject(name);
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const handleRenameFolder = (id: string) => {
    const name = editingFolderName.trim();
    if (name) renameProject(id, name);
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const handleDeleteFolder = (id: string) => {
    deleteProject(id);
    if (activeFolder === id) setActiveFolder(null);
    setFolderMenuId(null);
  };

  const selectFolder = (id: string | null) => {
    setActiveFolder(id);
    setShowFolderPanel(false);
  };

  return (
    <ShellLayout>
      <PageHeader
        title="Moodboard"
        subtitle={`${items.length} references collected`}
      />

      {/* ── Filter bar ── */}
      <div className="mb-7 flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as Category)}>
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat}>{categoryLabels[cat]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2.5">
          {/* Date filter */}
          <div className="relative">
            <button
              onClick={() => setShowDateMenu(v => !v)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all border"
              style={
                dateFilter !== "all"
                  ? { background: "var(--color-primary-light)", color: "var(--color-primary-ink)", borderColor: "var(--color-primary)" }
                  : { background: "var(--color-surface)", color: "var(--color-muted)", borderColor: "var(--color-hairline)" }
              }
            >
              {dateLabels[dateFilter]} <Icon name="chevron-down" size={13} />
            </button>
            <AnimatePresence>
              {showDateMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-1.5 z-50 rounded-[12px] overflow-hidden py-1 min-w-[150px] shadow-[0_8px_24px_rgba(16,40,48,0.12)]"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}
                >
                  {(Object.keys(dateLabels) as DateFilter[]).map((d) => (
                    <button key={d} onClick={() => { setDateFilter(d); setShowDateMenu(false); }}
                      className="w-full text-left px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--color-canvas)]"
                      style={{ color: dateFilter === d ? "var(--color-ink)" : "var(--color-muted)" }}>
                      {dateLabels[d]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Folder button */}
          <div className="relative">
            <button
              onClick={() => setShowFolderPanel(v => !v)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all border"
              style={
                activeFolder !== null || showFolderPanel
                  ? { background: "var(--color-primary-light)", color: "var(--color-primary-ink)", borderColor: "var(--color-primary)" }
                  : { background: "var(--color-surface)", color: "var(--color-muted)", borderColor: "var(--color-hairline)" }
              }
            >
              <Icon name={activeFolder !== null ? "folder-open" : "folder"} size={13} />
              {activeFolder !== null ? (activeFolderName ?? "Folder") : "Folders"}
              {activeFolder !== null && (
                <span
                  onClick={(e) => { e.stopPropagation(); selectFolder(null); }}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                  title="Kembali ke semua"
                >
                  <Icon name="x" size={10} />
                </span>
              )}
            </button>

            {/* Folder panel dropdown */}
            <AnimatePresence>
              {showFolderPanel && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 mt-2 z-50 rounded-[16px] overflow-hidden shadow-[0_12px_40px_rgba(16,40,48,0.16)] p-4"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", width: 340 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Folders</p>
                    {!showNewFolder && (
                      <button
                        onClick={() => setShowNewFolder(true)}
                        className="flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-lg transition-colors hover:bg-[var(--color-canvas)]"
                        style={{ color: "var(--color-primary-ink)" }}
                      >
                        <Icon name="plus" size={11} /> Folder baru
                      </button>
                    )}
                  </div>

                  {/* New folder input */}
                  {showNewFolder && (
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        autoFocus
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }}
                        placeholder="Nama folder…"
                        className="flex-1 px-3 py-1.5 rounded-[9px] text-[12.5px] border outline-none"
                        style={{ borderColor: "var(--color-primary)", background: "var(--color-canvas)", color: "var(--color-ink)" }}
                      />
                      <button onClick={handleCreateFolder}
                        className="px-2.5 py-1.5 rounded-[9px] text-[12px] font-semibold"
                        style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
                        Buat
                      </button>
                      <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                        className="p-1.5 rounded-[9px]"
                        style={{ color: "var(--color-muted)" }}>
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  )}

                  {/* Folder tiles grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Global tile */}
                    <button
                      onClick={() => selectFolder(null)}
                      className="relative rounded-[12px] overflow-hidden border transition-all text-left"
                      style={{
                        borderColor: activeFolder === null ? "var(--color-primary)" : "var(--color-hairline)",
                        background: "var(--color-canvas)",
                        boxShadow: activeFolder === null ? "0 0 0 2px var(--color-primary)" : undefined,
                      }}
                    >
                      {/* 2×2 preview mosaic */}
                      <div className="grid grid-cols-2 gap-0.5 p-0.5" style={{ height: 72 }}>
                        {folderCovers(items, null).slice(0, 4).map((it, i) => (
                          <div key={i} className="overflow-hidden" style={{ borderRadius: 4 }}>
                            {it.image_url ? (
                              <img src={it.image_url} alt="" className="w-full h-full object-cover" style={{ height: "100%" }} />
                            ) : (
                              <div className="w-full h-full" style={{ background: resolveCover(it.color, it.id) }} />
                            )}
                          </div>
                        ))}
                        {folderCovers(items, null).length === 0 && (
                          <div className="col-span-2 row-span-2 flex items-center justify-center" style={{ height: 72 }}>
                            <Icon name="image" size={22} style={{ color: "var(--color-muted-soft)" }} />
                          </div>
                        )}
                      </div>
                      <div className="px-2.5 pb-2.5 pt-1.5">
                        <p className="text-[12px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>Global</p>
                        <p className="text-[10.5px]" style={{ color: "var(--color-muted)" }}>{globalCount} items</p>
                      </div>
                      {activeFolder === null && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: "var(--color-primary)" }}>
                          <Icon name="check" size={8} style={{ color: "var(--color-on-primary)" }} />
                        </div>
                      )}
                    </button>

                    {/* Project folder tiles */}
                    {projects.map((proj) => {
                      const count = items.filter(i => i.projectId === proj.id).length;
                      const covers = folderCovers(items, proj.id);
                      const isActive = activeFolder === proj.id;
                      return (
                        <div key={proj.id} className="relative group">
                          <button
                            onClick={() => selectFolder(proj.id)}
                            className="w-full relative rounded-[12px] overflow-hidden border transition-all text-left"
                            style={{
                              borderColor: isActive ? "var(--color-primary)" : "var(--color-hairline)",
                              background: "var(--color-canvas)",
                              boxShadow: isActive ? "0 0 0 2px var(--color-primary)" : undefined,
                            }}
                          >
                            <div className="grid grid-cols-2 gap-0.5 p-0.5" style={{ height: 72 }}>
                              {covers.slice(0, 4).map((it, i) => (
                                <div key={i} className="overflow-hidden" style={{ borderRadius: 4 }}>
                                  {it.image_url ? (
                                    <img src={it.image_url} alt="" className="w-full h-full object-cover" style={{ height: "100%" }} />
                                  ) : (
                                    <div className="w-full h-full" style={{ background: resolveCover(it.color, it.id) }} />
                                  )}
                                </div>
                              ))}
                              {covers.length === 0 && (
                                <div className="col-span-2 row-span-2 flex items-center justify-center" style={{ height: 72 }}>
                                  <Icon name="folder" size={22} style={{ color: "var(--color-muted-soft)" }} />
                                </div>
                              )}
                            </div>
                            <div className="px-2.5 pb-2.5 pt-1.5">
                              {editingFolderId === proj.id ? (
                                <input
                                  autoFocus
                                  value={editingFolderName}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => setEditingFolderName(e.target.value)}
                                  onBlur={() => handleRenameFolder(proj.id)}
                                  onKeyDown={e => { if (e.key === "Enter") handleRenameFolder(proj.id); if (e.key === "Escape") setEditingFolderId(null); }}
                                  className="w-full text-[12px] font-semibold outline-none border-b"
                                  style={{ borderColor: "var(--color-primary)", background: "transparent", color: "var(--color-ink)" }}
                                />
                              ) : (
                                <p className="text-[12px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>{proj.name}</p>
                              )}
                              <p className="text-[10.5px]" style={{ color: "var(--color-muted)" }}>{count} items</p>
                            </div>
                            {isActive && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                                style={{ background: "var(--color-primary)" }}>
                                <Icon name="check" size={8} style={{ color: "var(--color-on-primary)" }} />
                              </div>
                            )}
                          </button>

                          {/* Folder context menu trigger (visible on hover) */}
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setFolderMenuId(folderMenuId === proj.id ? null : proj.id); }}
                                className="w-5 h-5 rounded-md flex items-center justify-center"
                                style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
                              >
                                <Icon name="more-vertical" size={9} />
                              </button>
                              <AnimatePresence>
                                {folderMenuId === proj.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute bottom-full right-0 mb-1 z-50 rounded-xl overflow-hidden shadow-lg py-1 min-w-[130px]"
                                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}
                                  >
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditingFolderId(proj.id); setEditingFolderName(proj.name); setFolderMenuId(null); }}
                                      className="w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-[var(--color-canvas)] flex items-center gap-2"
                                      style={{ color: "var(--color-ink)" }}
                                    >
                                      <Icon name="edit" size={11} /> Rename
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(proj.id); }}
                                      className="w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-red-50 flex items-center gap-2"
                                      style={{ color: "#c64545" }}
                                    >
                                      <Icon name="trash" size={11} /> Hapus
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button onClick={openAddModal}><Icon name="plus" size={15} /> Add Reference</Button>
        </div>
      </div>

      {/* Active folder breadcrumb */}
      {activeFolder !== null && (
        <div className="mb-4 flex items-center gap-2">
          <button onClick={() => selectFolder(null)} className="text-[12.5px] hover:underline" style={{ color: "var(--color-muted)" }}>
            Global
          </button>
          <Icon name="chevron-right" size={11} style={{ color: "var(--color-muted-soft)" }} />
          <span className="text-[12.5px] font-semibold" style={{ color: "var(--color-ink)" }}>{activeFolderName}</span>
        </div>
      )}

      {/* ── Masonry grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--color-muted-soft)" }}>
            {activeFolder === null ? "Belum ada reference di Global." : "Folder ini masih kosong."}
          </p>
          {activeFolder !== null && globalCount > 0 && (
            <p className="text-[12px]" style={{ color: "var(--color-muted-soft)" }}>
              Pindahkan reference dari Global dengan ikon folder pada setiap kartu.
            </p>
          )}
        </div>
      ) : (
        <>
          <style>{`
            .mood-grid { columns: 2; column-gap: 10px; }
            @media (min-width: 640px) { .mood-grid { columns: 3; } }
            @media (min-width: 1100px) { .mood-grid { columns: 4; } }
          `}</style>
          <div className="mood-grid" onClick={() => { setMoveMenuItemId(null); setFolderMenuId(null); setShowFolderPanel(false); setShowDateMenu(false); }}>
            <AnimatePresence>
              {filtered.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="break-inside-avoid mb-2.5 group relative overflow-hidden rounded-[12px] cursor-zoom-in"
                  style={{ border: "1px solid var(--color-hairline)" }}
                  onClick={() => setLightbox(item)}
                >
                  {item.image_url && item.media_type === "video" ? (
                    <video
                      src={item.image_url} autoPlay muted loop playsInline
                      ref={(el) => { if (el) el.play().catch(() => {}); }}
                      className="w-full block"
                      style={{ display: "block", background: resolveCover(item.color, item.id) }}
                    />
                  ) : item.image_url ? (
                    <img src={item.image_url} alt={item.title} loading="lazy"
                      className="w-full block"
                      style={{ display: "block", background: resolveCover(item.color, item.id) }}
                      onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                    />
                  ) : (
                    <div style={{ background: resolveCover(item.color, item.id), aspectRatio: "4/3" }} />
                  )}

                  {item.media_type === "video" && (
                    <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-lg flex items-center justify-center opacity-80 group-hover:opacity-0 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.55)" }}>
                      <Icon name="play" size={11} className="text-white" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)" }}>
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
                      {/* Move to folder */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMoveMenuItemId(moveMenuItemId === item.id ? null : item.id); }}
                          title="Pindah ke folder"
                          className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white shadow-sm transition-colors"
                        >
                          <Icon name={item.projectId ? "folder-open" : "folder"} size={12} className="text-[#3D5159]" />
                        </button>

                        <AnimatePresence>
                          {moveMenuItemId === item.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.1 }}
                              className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-lg py-1 min-w-[160px]"
                              style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}
                            >
                              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Pindah ke</p>
                              <button
                                onClick={() => { moveItem(item.id, null); setMoveMenuItemId(null); }}
                                className="w-full text-left px-3.5 py-2 text-[12.5px] font-medium hover:bg-[var(--color-canvas)] flex items-center gap-2"
                                style={{ color: !item.projectId ? "var(--color-primary-ink)" : "var(--color-ink)", background: !item.projectId ? "var(--color-primary-light)" : undefined }}
                              >
                                <Icon name="image" size={11} /> Global
                                {!item.projectId && <Icon name="check" size={10} className="ml-auto" />}
                              </button>
                              {projects.map(p => (
                                <button key={p.id}
                                  onClick={() => { moveItem(item.id, p.id); setMoveMenuItemId(null); }}
                                  className="w-full text-left px-3.5 py-2 text-[12.5px] font-medium hover:bg-[var(--color-canvas)] flex items-center gap-2"
                                  style={{ color: item.projectId === p.id ? "var(--color-primary-ink)" : "var(--color-ink)", background: item.projectId === p.id ? "var(--color-primary-light)" : undefined }}
                                >
                                  <Icon name="folder" size={11} />
                                  <span className="truncate">{p.name}</span>
                                  {item.projectId === p.id && <Icon name="check" size={10} className="ml-auto" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white shadow-sm transition-colors">
                          <Icon name="external-link" size={12} className="text-[#3D5159]" />
                        </a>
                      )}
                      <button onClick={() => deleteItem(item.id)}
                        className="w-7 h-7 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-red-50 shadow-sm transition-colors">
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

      {/* ── Lightbox ── */}
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
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-white font-semibold text-[15px]">{lightbox.title}</p>
                    <p className="text-white/60 text-[12px] mt-0.5">
                      {lightbox.source_domain || new Date(lightbox.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                    style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                    <Icon name={lightbox.projectId ? "folder" : "image"} size={10} />
                    {lightbox.projectId ? (projects.find(p => p.id === lightbox.projectId)?.name ?? "Project") : "Global"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Reference Dialog ── */}
      <Dialog open={showModal} onOpenChange={(o) => { setShowModal(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reference</DialogTitle>
            <DialogDescription>Upload an image or video for your board</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-5">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={(e) => handleFiles(e.target.files)} />

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
                  border: `2px dashed ${dragActive ? "var(--color-primary)" : "var(--color-hairline)"}`,
                  background: dragActive ? "var(--color-primary-light)" : "var(--color-canvas)",
                }}>
                <Icon name="upload-cloud" size={26} className="text-[var(--color-primary)]" />
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
            <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Simpan ke</label>
                <Select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}>
                  <option value="__global__">Global</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
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
              <Button className="flex-1" onClick={handleAddItem} disabled={!mediaData || saving}>
                {saving ? <><Icon name="spinner" size={14} spin /> Menyimpan…</> : "Add to Board"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Paste toast ── */}
      <AnimatePresence>
        {pasteToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full text-[13px] font-medium shadow-xl pointer-events-none"
            style={{ background: "var(--color-ink)", color: "var(--color-surface)" }}
          >
            {pasteToast}
          </motion.div>
        )}
      </AnimatePresence>
    </ShellLayout>
  );
}
