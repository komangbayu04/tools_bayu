"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface ScopeItem {
  id: string;
  title: string;
  description: string;
}

interface TimelinePhase {
  id: string;
  phase: string;
  duration: string;
  deliverables: string;
}

interface PricingRow {
  id: string;
  item: string;
  price: number;
}

const newScope = (): ScopeItem => ({ id: crypto.randomUUID(), title: "", description: "" });
const newPhase = (): TimelinePhase => ({ id: crypto.randomUUID(), phase: "", duration: "", deliverables: "" });
const newPrice = (): PricingRow => ({ id: crypto.randomUUID(), item: "", price: 0 });

const fmtIDR = (n: number) => "IDR " + new Intl.NumberFormat("en-US").format(n);
const LABEL = "block text-[11px] font-semibold uppercase tracking-wider mb-1.5";
const ls = { color: "var(--color-muted)" };
const divider = { borderTop: "1px solid var(--color-hairline)" };

export default function ProposalPage() {
  // Header
  const [fromName, setFromName] = useState("Bayu Krisnayana");
  const [fromTitle, setFromTitle] = useState("Freelance Designer & Creative Strategist");
  const [fromEmail, setFromEmail] = useState("");
  const [fromPhone, setFromPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [projectName, setProjectName] = useState("");
  const [docNo, setDocNo] = useState(() => {
    const y = new Date().getFullYear();
    const m = String(new Date().getMonth() + 1).padStart(2, "0");
    return `BK/P/${y}/${m}001`;
  });
  const [dateIssued, setDateIssued] = useState(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");

  // Overview
  const [overview, setOverview] = useState("");

  // Scope
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([newScope()]);

  // Timeline
  const [phases, setPhases] = useState<TimelinePhase[]>([newPhase()]);

  // Pricing
  const [pricing, setPricing] = useState<PricingRow[]>([newPrice()]);

  // Terms
  const [terms, setTerms] = useState(
    "• Pembayaran 50% di muka sebelum proyek dimulai, 50% setelah selesai.\n• Revisi maksimal 3x per deliverable.\n• Aset final diserahkan dalam 3 hari kerja setelah pelunasan."
  );

  // Share
  const [shareUrl, setShareUrl] = useState("");
  const [shareBusy, setShareBusy] = useState(false);

  const totalPrice = pricing.reduce((s, r) => s + r.price, 0);

  // ── Scope helpers ────────────────────────────────────────
  const updateScope = (id: string, field: keyof ScopeItem, val: string) =>
    setScopeItems((p) => p.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
  const removeScope = (id: string) => setScopeItems((p) => p.filter((s) => s.id !== id));

  // ── Timeline helpers ─────────────────────────────────────
  const updatePhase = (id: string, field: keyof TimelinePhase, val: string) =>
    setPhases((p) => p.map((ph) => (ph.id === id ? { ...ph, [field]: val } : ph)));
  const removePhase = (id: string) => setPhases((p) => p.filter((ph) => ph.id !== id));

  // ── Pricing helpers ──────────────────────────────────────
  const updatePrice = (id: string, field: keyof PricingRow, val: string | number) =>
    setPricing((p) => p.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const removePrice = (id: string) => setPricing((p) => p.filter((r) => r.id !== id));

  // ── Share ────────────────────────────────────────────────
  const handleShare = async () => {
    if (!supabase) return;
    setShareBusy(true);
    const snapshot = {
      docType: "proposal",
      fromName, fromTitle, fromEmail, fromPhone,
      clientName, clientCompany, projectName, docNo, dateIssued, validUntil,
      overview, scopeItems, phases, pricing, terms,
    };
    const { data, error } = await supabase
      .from("shared_invoices")
      .insert({ snapshot })
      .select("id")
      .single();
    if (!error && data) {
      const url = `${window.location.origin}/invoice/share/${data.id}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
    }
    setShareBusy(false);
  };

  const inputCls = "w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2";
  const inputStyle = {
    background: "var(--color-surface)",
    borderColor: "var(--color-hairline)",
    color: "var(--color-body)",
  };

  return (
    <ShellLayout>
      <PageHeader title="Proposal" subtitle="Buat proposal proyek profesional" />

      <div className="flex flex-col lg:flex-row gap-6 pb-16">
        {/* ── FORM ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Header Info */}
          <section className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Header</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} style={ls}>Nomor Dokumen</label>
                <Input value={docNo} onChange={(e) => setDocNo(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} style={ls}>Tanggal Dibuat</label>
                <Input type="date" value={dateIssued} onChange={(e) => setDateIssued(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} style={ls}>Berlaku Hingga</label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div style={divider} className="pt-4 grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} style={ls}>Dari (Nama)</label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} style={ls}>Jabatan / Spesialisasi</label>
                <Input value={fromTitle} onChange={(e) => setFromTitle(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} style={ls}>Email</label>
                <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} style={ls}>Telepon</label>
                <Input value={fromPhone} onChange={(e) => setFromPhone(e.target.value)} />
              </div>
            </div>
            <div style={divider} className="pt-4 grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} style={ls}>Kepada (Nama)</label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} style={ls}>Perusahaan Klien</label>
                <Input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={LABEL} style={ls}>Nama Proyek</label>
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Project Overview */}
          <section className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Ringkasan Proyek</p>
            <Textarea
              rows={4}
              placeholder="Jelaskan latar belakang proyek, kebutuhan klien, dan pendekatan yang akan digunakan..."
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
            />
          </section>

          {/* Scope of Work */}
          <section className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Lingkup Pekerjaan</p>
              <button onClick={() => setScopeItems((p) => [...p, newScope()])} className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}>
                <Icon name="plus" size={11} /> Tambah
              </button>
            </div>
            {scopeItems.map((s, i) => (
              <div key={s.id} className="flex gap-3 items-start p-3 rounded-xl" style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)" }}>
                <span className="mt-2.5 text-[11px] font-bold w-5 text-center flex-shrink-0" style={{ color: "var(--color-muted-soft)" }}>{i + 1}</span>
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    className={inputCls}
                    style={inputStyle}
                    placeholder="Judul (mis. Brand Identity)"
                    value={s.title}
                    onChange={(e) => updateScope(s.id, "title", e.target.value)}
                  />
                  <textarea
                    className={inputCls}
                    style={inputStyle}
                    rows={2}
                    placeholder="Deskripsi singkat deliverable..."
                    value={s.description}
                    onChange={(e) => updateScope(s.id, "description", e.target.value)}
                  />
                </div>
                {scopeItems.length > 1 && (
                  <button onClick={() => removeScope(s.id)} className="mt-2 p-1.5 rounded-lg hover:bg-red-50" style={{ color: "var(--color-muted-soft)" }}>
                    <Icon name="trash" size={13} />
                  </button>
                )}
              </div>
            ))}
          </section>

          {/* Timeline */}
          <section className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Timeline</p>
              <button onClick={() => setPhases((p) => [...p, newPhase()])} className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}>
                <Icon name="plus" size={11} /> Fase
              </button>
            </div>
            {phases.map((ph, i) => (
              <div key={ph.id} className="flex gap-3 items-start p-3 rounded-xl" style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)" }}>
                <span className="mt-2.5 text-[11px] font-bold w-5 text-center flex-shrink-0" style={{ color: "var(--color-muted-soft)" }}>{i + 1}</span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input className={inputCls} style={inputStyle} placeholder="Fase (mis. Discovery)" value={ph.phase} onChange={(e) => updatePhase(ph.id, "phase", e.target.value)} />
                  <input className={inputCls} style={inputStyle} placeholder="Durasi (mis. 3 hari)" value={ph.duration} onChange={(e) => updatePhase(ph.id, "duration", e.target.value)} />
                  <textarea className={`${inputCls} col-span-2`} style={inputStyle} rows={2} placeholder="Deliverables di fase ini..." value={ph.deliverables} onChange={(e) => updatePhase(ph.id, "deliverables", e.target.value)} />
                </div>
                {phases.length > 1 && (
                  <button onClick={() => removePhase(ph.id)} className="mt-2 p-1.5 rounded-lg hover:bg-red-50" style={{ color: "var(--color-muted-soft)" }}>
                    <Icon name="trash" size={13} />
                  </button>
                )}
              </div>
            ))}
          </section>

          {/* Pricing */}
          <section className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Investasi</p>
              <button onClick={() => setPricing((p) => [...p, newPrice()])} className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}>
                <Icon name="plus" size={11} /> Tambah
              </button>
            </div>
            {pricing.map((r) => (
              <div key={r.id} className="flex gap-3 items-center p-3 rounded-xl" style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)" }}>
                <input className={`${inputCls} flex-1`} style={inputStyle} placeholder="Item / Layanan" value={r.item} onChange={(e) => updatePrice(r.id, "item", e.target.value)} />
                <input
                  type="number"
                  className={`${inputCls} w-40`}
                  style={inputStyle}
                  placeholder="Harga"
                  value={r.price || ""}
                  onChange={(e) => updatePrice(r.id, "price", Number(e.target.value))}
                />
                {pricing.length > 1 && (
                  <button onClick={() => removePrice(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0" style={{ color: "var(--color-muted-soft)" }}>
                    <Icon name="trash" size={13} />
                  </button>
                )}
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <div className="text-[14px] font-bold" style={{ color: "var(--color-primary-ink)" }}>
                Total: {fmtIDR(totalPrice)}
              </div>
            </div>
          </section>

          {/* Terms */}
          <section className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Syarat & Ketentuan</p>
            <Textarea rows={5} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </section>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => window.print()} variant="outline" className="flex items-center gap-2">
              <Icon name="download" size={13} /> Export PDF
            </Button>
            <Button onClick={handleShare} disabled={shareBusy} className="flex items-center gap-2">
              <Icon name={shareBusy ? "spinner" : "link"} size={13} spin={shareBusy} /> Buat Link Klien
            </Button>
          </div>
          {shareUrl && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px]" style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}>
              <Icon name="check-circle" size={14} />
              <span className="flex-1 truncate font-mono">{shareUrl}</span>
              <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="text-[12px] font-semibold underline">Salin Lagi</button>
            </div>
          )}
        </div>

        {/* ── PREVIEW ──────────────────────────────────────────── */}
        <div className="lg:w-[420px] flex-shrink-0">
          <div className="sticky top-6">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted-soft)" }}>Preview</p>
            <div
              className="printable rounded-2xl overflow-auto"
              style={{ background: "#fff", color: "#1a1a1a", padding: "36px 40px", fontSize: 12, lineHeight: 1.6, maxHeight: "85vh", boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}
            >
              {/* Doc header */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 20, color: "#111", marginBottom: 2 }}>{fromName || "Nama Anda"}</p>
                  <p style={{ color: "#666", fontSize: 11 }}>{fromTitle}</p>
                  {fromEmail && <p style={{ color: "#666", fontSize: 11 }}>{fromEmail}</p>}
                  {fromPhone && <p style={{ color: "#666", fontSize: 11 }}>{fromPhone}</p>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: "#3a6b1c", marginBottom: 4 }}>PROPOSAL</p>
                  <p style={{ fontSize: 11, color: "#888" }}>{docNo}</p>
                  <p style={{ fontSize: 11, color: "#888" }}>{dateIssued}</p>
                  {validUntil && <p style={{ fontSize: 11, color: "#888" }}>Berlaku: {validUntil}</p>}
                </div>
              </div>

              {/* To */}
              {(clientName || clientCompany || projectName) && (
                <div style={{ background: "#f8fdf4", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Ditujukan Kepada</p>
                  <p style={{ fontWeight: 700, color: "#111" }}>{clientName}</p>
                  {clientCompany && <p style={{ color: "#555" }}>{clientCompany}</p>}
                  {projectName && <p style={{ color: "#3a6b1c", fontWeight: 600, marginTop: 4 }}>Proyek: {projectName}</p>}
                </div>
              )}

              {/* Overview */}
              {overview && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 6, borderBottom: "1.5px solid #e8e8e8", paddingBottom: 4 }}>Ringkasan Proyek</p>
                  <p style={{ color: "#444", whiteSpace: "pre-wrap" }}>{overview}</p>
                </div>
              )}

              {/* Scope */}
              {scopeItems.some((s) => s.title) && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 8, borderBottom: "1.5px solid #e8e8e8", paddingBottom: 4 }}>Lingkup Pekerjaan</p>
                  {scopeItems.filter((s) => s.title).map((s, i) => (
                    <div key={s.id} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: "#3a6b1c", minWidth: 18 }}>{i + 1}.</span>
                      <div>
                        <p style={{ fontWeight: 600, color: "#111" }}>{s.title}</p>
                        {s.description && <p style={{ color: "#666" }}>{s.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline */}
              {phases.some((ph) => ph.phase) && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 8, borderBottom: "1.5px solid #e8e8e8", paddingBottom: 4 }}>Timeline</p>
                  {phases.filter((ph) => ph.phase).map((ph, i) => (
                    <div key={ph.id} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: "#3a6b1c", minWidth: 18 }}>{i + 1}.</span>
                      <div>
                        <p style={{ fontWeight: 600, color: "#111" }}>{ph.phase}{ph.duration ? ` — ${ph.duration}` : ""}</p>
                        {ph.deliverables && <p style={{ color: "#666" }}>{ph.deliverables}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing */}
              {pricing.some((r) => r.item) && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 8, borderBottom: "1.5px solid #e8e8e8", paddingBottom: 4 }}>Investasi</p>
                  {pricing.filter((r) => r.item).map((r) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#444" }}>{r.item}</span>
                      <span style={{ fontWeight: 600 }}>{fmtIDR(r.price)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px solid #e8e8e8", paddingTop: 8, marginTop: 6, fontWeight: 700, color: "#111" }}>
                    <span>Total</span>
                    <span style={{ color: "#3a6b1c" }}>{fmtIDR(totalPrice)}</span>
                  </div>
                </div>
              )}

              {/* Terms */}
              {terms && (
                <div>
                  <p style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 6, borderBottom: "1.5px solid #e8e8e8", paddingBottom: 4 }}>Syarat & Ketentuan</p>
                  <p style={{ color: "#555", whiteSpace: "pre-wrap", fontSize: 11 }}>{terms}</p>
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1.5px solid #e8e8e8", display: "flex", justifyContent: "flex-end" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#888", fontSize: 11, marginBottom: 40 }}>Hormat kami,</p>
                  <p style={{ fontWeight: 700, color: "#111" }}>{fromName}</p>
                  <p style={{ color: "#666", fontSize: 11 }}>{fromTitle}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}
