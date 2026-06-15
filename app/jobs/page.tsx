"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/Markdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSavedJobStore } from "@/lib/store";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface JobItem {
  id: string;
  title: string;
  company: string;
  category: string;
  type: string;
  location: string;
  salary: string;
  url: string;
  date: string;
  tags: string[];
  description: string;
}

const CATEGORIES = [
  { value: "", label: "Semua kategori" },
  { value: "software-dev", label: "Software Development" },
  { value: "design", label: "Design" },
  { value: "writing", label: "Writing" },
  { value: "marketing", label: "Marketing" },
  { value: "product", label: "Product" },
  { value: "data", label: "Data" },
  { value: "customer-support", label: "Customer Support" },
];

export default function JobsPage() {
  const { jobs: savedJobs, toggleJob } = useSavedJobStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState<"search" | "saved">("search");

  // Proposal dialog
  const [proposalJob, setProposalJob] = useState<JobItem | null>(null);
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("Indonesian");
  const [highlights, setHighlights] = useState("");
  const [proposal, setProposal] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      if (data.error && !data.jobs?.length) setError(data.error);
      setJobs(data.jobs ?? []);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const openProposal = (job: JobItem) => {
    setProposalJob(job);
    setProposal("");
    setHighlights("");
    setCopied(false);
  };

  const generateProposal = async () => {
    if (!proposalJob) return;
    setGenerating(true);
    setProposal("");
    try {
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: proposalJob.title,
          company: proposalJob.company,
          jobDescription: proposalJob.description,
          tone,
          highlights,
          language,
        }),
      });
      const data = await res.json();
      setProposal(data.proposal ?? data.error ?? "Gagal membuat proposal.");
    } catch {
      setProposal("Koneksi gagal. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  };

  const copyProposal = () => {
    navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isSaved = (id: string) => savedJobs.some((j) => j.id === id);

  const renderJobCard = (job: JobItem) => (
    <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[14px] border p-5 flex flex-col gap-3" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold" style={{ color: "var(--color-ink)" }}>{job.title}</p>
          <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>{job.company}</p>
        </div>
        <button onClick={() => toggleJob({ id: job.id, title: job.title, company: job.company, location: job.location, url: job.url, category: job.category })}
          className="p-1.5 rounded-lg flex-shrink-0 transition-colors hover:bg-[var(--color-canvas)]"
          style={{ color: isSaved(job.id) ? "var(--color-primary)" : "var(--color-muted-soft)" }} title="Simpan job">
          <Icon name="star" size={16} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {job.type && <Badge variant="teal">{job.type.replace(/_/g, " ")}</Badge>}
        <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--color-muted)" }}><Icon name="map-pin" size={11} /> {job.location}</span>
        {job.salary && <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--color-muted)" }}><Icon name="money-bill" size={11} /> {job.salary}</span>}
        {job.date && <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>· {format(new Date(job.date), "d MMM")}</span>}
      </div>

      {job.description && <p className="text-[12.5px] line-clamp-2" style={{ color: "var(--color-muted)" }}>{job.description}</p>}

      <div className="flex items-center gap-2 mt-auto pt-1">
        <Button size="sm" onClick={() => openProposal(job)}><Icon name="send" size={13} className="mr-1.5" /> Buat Proposal</Button>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline"><Icon name="external-link" size={13} className="mr-1.5" /> Lamar</Button>
          </a>
        )}
      </div>
    </motion.div>
  );

  return (
    <ShellLayout>
      <PageHeader title="Jobs" subtitle="Cari peluang freelance & remote, lalu buat proposal dengan AI" />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-[12px] w-fit" style={{ background: "var(--color-canvas)" }}>
        {([["search", "Cari Job"], ["saved", `Tersimpan${savedJobs.length ? ` (${savedJobs.length})` : ""}`]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-4 py-2 rounded-[9px] text-[13px] font-semibold transition-all"
            style={tab === key ? { background: "var(--color-surface)", color: "var(--color-primary-ink)", boxShadow: "var(--shadow-card)" } : { color: "var(--color-muted)" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "search" ? (
        <>
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari: react developer, ui designer, copywriter…"
              className="flex-1 bg-[var(--color-surface-card)]" onKeyDown={(e) => e.key === "Enter" && fetchJobs()} />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-56">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Button onClick={fetchJobs} disabled={loading}>
              {loading ? <Icon name="spinner" size={15} spin /> : <Icon name="search" size={15} />} Cari
            </Button>
          </div>

          {error && (
            <div className="rounded-[12px] px-4 py-3 mb-4 text-[13px]" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
              {error}
            </div>
          )}

          {!searched ? (
            <div className="rounded-[14px] border border-dashed flex flex-col items-center text-center py-16 px-6" style={{ borderColor: "var(--color-hairline)" }}>
              <Icon name="briefcase" size={28} style={{ color: "var(--color-muted-soft)" }} />
              <p className="mt-3 text-[14px] font-medium" style={{ color: "var(--color-ink)" }}>Cari peluang kerja remote</p>
              <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>Masukkan kata kunci atau pilih kategori, lalu klik Cari.</p>
            </div>
          ) : loading ? (
            <div className="py-16 text-center"><Icon name="spinner" size={24} spin style={{ color: "var(--color-primary)" }} /></div>
          ) : jobs.length === 0 ? (
            <p className="py-12 text-center text-[13px]" style={{ color: "var(--color-muted)" }}>Tidak ada job ditemukan. Coba kata kunci lain.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{jobs.map(renderJobCard)}</div>
          )}
        </>
      ) : (
        savedJobs.length === 0 ? (
          <div className="rounded-[14px] border border-dashed flex flex-col items-center text-center py-16 px-6" style={{ borderColor: "var(--color-hairline)" }}>
            <Icon name="star" size={28} style={{ color: "var(--color-muted-soft)" }} />
            <p className="mt-3 text-[14px] font-medium" style={{ color: "var(--color-ink)" }}>Belum ada job tersimpan</p>
            <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>Klik ikon bintang pada job untuk menyimpannya.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedJobs.map((job) => (
              <div key={job.id} className="rounded-[14px] border p-5 flex items-start justify-between gap-3" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold" style={{ color: "var(--color-ink)" }}>{job.title}</p>
                  <p className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>{job.company} · {job.location}</p>
                  <div className="flex items-center gap-2 mt-2.5">
                    {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline"><Icon name="external-link" size={13} className="mr-1.5" /> Lamar</Button></a>}
                  </div>
                </div>
                <button onClick={() => toggleJob({ id: job.id, title: job.title, company: job.company, location: job.location, url: job.url, category: job.category })}
                  className="p-1.5 rounded-lg flex-shrink-0" style={{ color: "var(--color-primary)" }}><Icon name="star" size={16} /></button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Proposal dialog */}
      <Dialog open={!!proposalJob} onOpenChange={(o) => !o && setProposalJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Proposal</DialogTitle>
            <DialogDescription>{proposalJob?.title} — {proposalJob?.company}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-6 pb-6 pt-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Tone</label>
                <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option value="professional">Profesional</option>
                  <option value="friendly">Ramah</option>
                  <option value="confident">Percaya diri</option>
                </Select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Bahasa</label>
                <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="Indonesian">Indonesia</option>
                  <option value="English">English</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Keahlian / Portfolio (opsional)</label>
              <Textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={3} placeholder="Contoh: 5 tahun React, pernah bangun dashboard SaaS, portfolio di…" />
            </div>
            <Button onClick={generateProposal} disabled={generating}>
              {generating ? <><Icon name="spinner" size={14} spin className="mr-1.5" /> Membuat…</> : <><Icon name="sparkles" size={14} className="mr-1.5" /> Generate Proposal</>}
            </Button>

            <AnimatePresence>
              {proposal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[12px] border p-4" style={{ borderColor: "var(--color-hairline)", background: "var(--color-canvas)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Hasil</span>
                    <button onClick={copyProposal} className="flex items-center gap-1.5 text-[12px] font-semibold hover:opacity-70" style={{ color: "var(--color-primary)" }}>
                      <Icon name={copied ? "check" : "copy"} size={13} /> {copied ? "Tersalin" : "Salin"}
                    </button>
                  </div>
                  <Markdown>{proposal}</Markdown>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}
