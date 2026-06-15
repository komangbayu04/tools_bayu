"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useInvoiceHistoryStore } from "@/lib/store";

const fmtIDR = (n: number) => "IDR " + new Intl.NumberFormat("en-US").format(n);
const LABEL = "block text-[11px] font-semibold uppercase tracking-wider mb-1.5";
const ls = { color: "var(--color-muted)" };
const divider = { borderTop: "1px solid var(--color-hairline)" };

const DEFAULT_IP = "Seluruh karya, desain, dan aset yang dibuat oleh Pihak Pertama dalam proyek ini menjadi milik Pihak Kedua sepenuhnya setelah pelunasan pembayaran.";
const DEFAULT_REVISION = "Pihak Pertama menyediakan maksimal 3 (tiga) kali revisi per deliverable. Revisi tambahan di luar ketentuan dikenakan biaya tambahan yang disepakati bersama.";
const DEFAULT_CONFIDENTIAL = "Kedua belah pihak sepakat untuk menjaga kerahasiaan informasi yang diperoleh selama pelaksanaan proyek ini dan tidak mengungkapkannya kepada pihak ketiga tanpa persetujuan tertulis.";
const DEFAULT_TERMINATION = "Salah satu pihak dapat mengakhiri perjanjian ini dengan pemberitahuan tertulis 7 (tujuh) hari kerja sebelumnya. Pekerjaan yang telah selesai tetap ditagihkan.";

export default function ContractPage() {
  // Parties
  const [freelancerName, setFreelancerName] = useState("I Komang Bayu Krisnayana");
  const [freelancerAddress, setFreelancerAddress] = useState("Jln. Dewi Sartika No.19, Semarapura Kaja, Klungkung, Bali");
  const [freelancerEmail, setFreelancerEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // Project
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [docNo, setDocNo] = useState(() => {
    const y = new Date().getFullYear();
    const m = String(new Date().getMonth() + 1).padStart(2, "0");
    return `BK/K/${y}/${m}001`;
  });

  // Payment
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("50% di muka sebelum proyek dimulai, 50% setelah serah terima final.");
  const [bankInfo, setBankInfo] = useState("BCA 3950456514 a/n I Komang Bayu Krisnayana");

  // Clauses
  const [ipClause, setIpClause] = useState(DEFAULT_IP);
  const [revisionClause, setRevisionClause] = useState(DEFAULT_REVISION);
  const [confidentialClause, setConfidentialClause] = useState(DEFAULT_CONFIDENTIAL);
  const [terminationClause, setTerminationClause] = useState(DEFAULT_TERMINATION);
  const [additionalClauses, setAdditionalClauses] = useState("");

  // Share
  const [shareUrl, setShareUrl] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveDoc = useInvoiceHistoryStore((s) => s.saveDoc);

  const handleSave = () => {
    const snapshot = {
      docType: "contract",
      freelancerName, freelancerAddress, freelancerEmail,
      clientName, clientCompany, clientAddress,
      projectName, projectDescription, startDate, endDate, docNo,
      totalAmount, paymentTerms, bankInfo,
      ipClause, revisionClause, confidentialClause, terminationClause, additionalClauses,
    };
    saveDoc({
      type: "contract",
      clientName: clientName || clientCompany || "—",
      title: projectName || undefined,
      docNo: docNo || undefined,
      dateIssued: startDate,
      total: totalAmount,
      snapshot,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleShare = async () => {
    if (!supabase) return;
    setShareBusy(true);
    const snapshot = {
      docType: "contract",
      freelancerName, freelancerAddress, freelancerEmail,
      clientName, clientCompany, clientAddress,
      projectName, projectDescription, startDate, endDate, docNo,
      totalAmount, paymentTerms, bankInfo,
      ipClause, revisionClause, confidentialClause, terminationClause, additionalClauses,
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
      <PageHeader title="Kontrak Kerja" subtitle="Buat perjanjian kerja freelance yang jelas dan profesional" />

      <div className="flex flex-col lg:flex-row gap-6 pb-16">
        {/* ── FORM ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Document Info */}
          <section className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Info Dokumen</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} style={ls}>Nomor Kontrak</label>
                <Input value={docNo} onChange={(e) => setDocNo(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} style={ls}>Tanggal Mulai</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} style={ls}>Tanggal Selesai (estimasi)</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Parties */}
          <section className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Para Pihak</p>
            <div>
              <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--color-body)" }}>Pihak Pertama (Freelancer)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} style={ls}>Nama Lengkap</label>
                  <Input value={freelancerName} onChange={(e) => setFreelancerName(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL} style={ls}>Email</label>
                  <Input value={freelancerEmail} onChange={(e) => setFreelancerEmail(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={LABEL} style={ls}>Alamat</label>
                  <Input value={freelancerAddress} onChange={(e) => setFreelancerAddress(e.target.value)} />
                </div>
              </div>
            </div>
            <div style={divider} className="pt-4">
              <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--color-body)" }}>Pihak Kedua (Klien)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} style={ls}>Nama</label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL} style={ls}>Perusahaan</label>
                  <Input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={LABEL} style={ls}>Alamat</label>
                  <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          {/* Project Scope */}
          <section className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Detail Proyek</p>
            <div>
              <label className={LABEL} style={ls}>Nama Proyek</label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            </div>
            <div>
              <label className={LABEL} style={ls}>Deskripsi Pekerjaan</label>
              <Textarea rows={4} placeholder="Jelaskan lingkup pekerjaan yang disepakati..." value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Pembayaran</p>
            <div>
              <label className={LABEL} style={ls}>Total Biaya (IDR)</label>
              <Input type="number" value={totalAmount || ""} onChange={(e) => setTotalAmount(Number(e.target.value))} placeholder="0" />
              {totalAmount > 0 && <p className="mt-1 text-[12px] font-semibold" style={{ color: "var(--color-primary)" }}>{fmtIDR(totalAmount)}</p>}
            </div>
            <div>
              <label className={LABEL} style={ls}>Syarat Pembayaran</label>
              <Textarea rows={2} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </div>
            <div>
              <label className={LABEL} style={ls}>Info Rekening</label>
              <Input value={bankInfo} onChange={(e) => setBankInfo(e.target.value)} />
            </div>
          </section>

          {/* Clauses */}
          <section className="rounded-2xl p-5 flex flex-col gap-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}>
            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Klausul Kontrak</p>
            {[
              { label: "Hak Kekayaan Intelektual", value: ipClause, set: setIpClause },
              { label: "Kebijakan Revisi", value: revisionClause, set: setRevisionClause },
              { label: "Kerahasiaan", value: confidentialClause, set: setConfidentialClause },
              { label: "Penghentian Kontrak", value: terminationClause, set: setTerminationClause },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className={LABEL} style={ls}>{label}</label>
                <Textarea rows={3} value={value} onChange={(e) => set(e.target.value)} />
              </div>
            ))}
            <div>
              <label className={LABEL} style={ls}>Klausul Tambahan (opsional)</label>
              <Textarea rows={3} placeholder="Tambahkan syarat khusus lainnya..." value={additionalClauses} onChange={(e) => setAdditionalClauses(e.target.value)} />
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => window.print()} variant="outline" className="flex items-center gap-2">
              <Icon name="download" size={13} /> Export PDF
            </Button>
            <Button onClick={handleShare} disabled={shareBusy} className="flex items-center gap-2">
              <Icon name={shareBusy ? "spinner" : "link"} size={13} spin={shareBusy} /> Buat Link Klien
            </Button>
            <Button onClick={handleSave} variant="outline" className="flex items-center gap-2">
              <Icon name={saved ? "check-circle" : "save"} size={13} /> {saved ? "Tersimpan!" : "Simpan ke Riwayat"}
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
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p style={{ fontWeight: 800, fontSize: 17, color: "#111", letterSpacing: 0.5 }}>PERJANJIAN KERJA FREELANCE</p>
                <p style={{ color: "#888", fontSize: 11 }}>{docNo}</p>
              </div>

              {/* Parties */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 8, borderBottom: "1.5px solid #e8e8e8", paddingBottom: 4 }}>Para Pihak</p>
                <p style={{ marginBottom: 6 }}>
                  <strong>Pihak Pertama:</strong> {freelancerName}{freelancerEmail ? ` (${freelancerEmail})` : ""}
                  {freelancerAddress && <><br /><span style={{ color: "#666" }}>{freelancerAddress}</span></>}
                </p>
                <p>
                  <strong>Pihak Kedua:</strong> {clientName}{clientCompany ? ` / ${clientCompany}` : ""}
                  {clientAddress && <><br /><span style={{ color: "#666" }}>{clientAddress}</span></>}
                </p>
              </div>

              {/* Project */}
              {(projectName || projectDescription) && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 6, borderBottom: "1.5px solid #e8e8e8", paddingBottom: 4 }}>Ruang Lingkup Pekerjaan</p>
                  {projectName && <p style={{ fontWeight: 600, marginBottom: 4 }}>{projectName}</p>}
                  {projectDescription && <p style={{ color: "#444", whiteSpace: "pre-wrap" }}>{projectDescription}</p>}
                  {(startDate || endDate) && (
                    <p style={{ color: "#888", marginTop: 6, fontSize: 11 }}>
                      Periode: {startDate}{endDate ? ` s/d ${endDate}` : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Payment */}
              {(totalAmount > 0 || paymentTerms) && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 6, borderBottom: "1.5px solid #e8e8e8", paddingBottom: 4 }}>Pembayaran</p>
                  {totalAmount > 0 && <p style={{ fontWeight: 700, fontSize: 14, color: "#3a6b1c", marginBottom: 4 }}>{fmtIDR(totalAmount)}</p>}
                  {paymentTerms && <p style={{ color: "#444" }}>{paymentTerms}</p>}
                  {bankInfo && <p style={{ color: "#666", marginTop: 4, fontSize: 11 }}>Rekening: {bankInfo}</p>}
                </div>
              )}

              {/* Clauses */}
              {[
                { title: "Hak Kekayaan Intelektual", text: ipClause },
                { title: "Kebijakan Revisi", text: revisionClause },
                { title: "Kerahasiaan", text: confidentialClause },
                { title: "Penghentian Kontrak", text: terminationClause },
                ...(additionalClauses ? [{ title: "Ketentuan Tambahan", text: additionalClauses }] : []),
              ].map(({ title, text }) => (
                <div key={title} style={{ marginBottom: 14 }}>
                  <p style={{ fontWeight: 700, fontSize: 11, color: "#111", marginBottom: 4, borderBottom: "1px solid #efefef", paddingBottom: 3 }}>{title}</p>
                  <p style={{ color: "#555", whiteSpace: "pre-wrap", fontSize: 11 }}>{text}</p>
                </div>
              ))}

              {/* Signatures */}
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1.5px solid #e8e8e8", display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center", width: "45%" }}>
                  <p style={{ color: "#888", fontSize: 11, marginBottom: 40 }}>Pihak Pertama,</p>
                  <div style={{ borderTop: "1px solid #aaa", paddingTop: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: "#111" }}>{freelancerName}</p>
                  </div>
                </div>
                <div style={{ textAlign: "center", width: "45%" }}>
                  <p style={{ color: "#888", fontSize: 11, marginBottom: 40 }}>Pihak Kedua,</p>
                  <div style={{ borderTop: "1px solid #aaa", paddingTop: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: "#111" }}>{clientName || "_______________"}</p>
                    {clientCompany && <p style={{ color: "#666", fontSize: 11 }}>{clientCompany}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}
