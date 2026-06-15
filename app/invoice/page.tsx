"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useInvoiceHistoryStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

type DocumentType = "invoice" | "quotation";

// ─── Invoice types ─────────────────────────────────────────────────
interface LineItem {
  id: string;
  date: string;
  title: string;
  tasks: string;
  project: string;
  hours: number;
}

// ─── Quotation types ──────────────────────────────────────────────
interface QuoteItem {
  id: string;
  service: string;
  description: string;
  packageItems: string;
  includes: string;
  price: number;
  qty: number;
}

const newLineItem = (): LineItem => ({ id: crypto.randomUUID(), date: "", title: "", tasks: "", project: "", hours: 0 });
const newQuoteItem = (): QuoteItem => ({ id: crypto.randomUUID(), service: "", description: "", packageItems: "", includes: "", price: 0, qty: 1 });

const fmtIDR = (n: number) => "IDR " + new Intl.NumberFormat("en-US").format(n);
const bullets = (text: string) => text.split("\n").map(t => t.trim()).filter(Boolean);
const FIELD_LABEL = "block text-[11px] font-semibold uppercase tracking-wider mb-1.5";
const labelStyle = { color: "var(--color-muted)" };
const divider = { borderTop: "1px solid var(--color-hairline)" };

export default function InvoicePage() {
  const { saveDoc } = useInvoiceHistoryStore();
  const router = useRouter();
  const [docType, setDocType] = useState<DocumentType>("invoice");

  // Shared fields
  const [fromName, setFromName] = useState("Bayu Krisnayana");
  const [fromAddress, setFromAddress] = useState("Jln. Dewi Sartika No.19, Semarapura Kaja, Klungkung\nBali, Indonesia, 80711");
  const [clientName, setClientName] = useState("");
  const [dateIssued, setDateIssued] = useState(() => new Date().toISOString().slice(0, 10));

  // Invoice-only
  const [paymentStatus, setPaymentStatus] = useState("Waiting for payment");
  const [dueDate, setDueDate] = useState("");
  const [rate, setRate] = useState(100000);
  const [totalTasks, setTotalTasks] = useState(1);
  const [items, setItems] = useState<LineItem[]>(() => [newLineItem()]);

  // Quotation-only
  const [companyName, setCompanyName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [docNo, setDocNo] = useState("BK/Q/2026/0001");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(() => [newQuoteItem()]);

  // Payment info
  const [bankName, setBankName] = useState("BCA (Bank Central Asia)");
  const [bankAddress, setBankAddress] = useState("Jl. Puputan Galiran No.88C, Semarapura Kelod, Kec. Klungkung, Kabupaten Klungkung, Bali 80715");
  const [bankCountry, setBankCountry] = useState("Indonesia");
  const [accHolder, setAccHolder] = useState("I Komang Bayu Krisnayana");
  const [accAddress, setAccAddress] = useState("Jln. Dewi Sartika No.19, Semarapura Kaja, Klungkung");
  const [accNo, setAccNo] = useState("3950456514");
  const [swift, setSwift] = useState("CENAIDJA");
  const [bankCode, setBankCode] = useState("014");
  const [branchCode, setBranchCode] = useState("0395");
  const [contactName, setContactName] = useState("Bayu Krisnayana");
  const [contactEmail, setContactEmail] = useState("bayuajoes321@gmail.com");
  const [contactPhone, setContactPhone] = useState("+6285 792 352 806");

  // Line item actions – invoice
  const addItem = () => setItems(p => [...p, newLineItem()]);
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));
  const updateItem = (id: string, field: keyof LineItem, value: string | number) =>
    setItems(p => p.map(i => i.id === id ? { ...i, [field]: value } : i));

  // Line item actions – quote
  const addQuoteItem = () => setQuoteItems(p => [...p, newQuoteItem()]);
  const removeQuoteItem = (id: string) => setQuoteItems(p => p.filter(i => i.id !== id));
  const updateQuoteItem = (id: string, field: keyof QuoteItem, value: string | number) =>
    setQuoteItems(p => p.map(i => i.id === id ? { ...i, [field]: value } : i));

  const invoiceSubtotal = (item: LineItem) => item.hours * rate;
  const invoiceTotal = items.reduce((s, i) => s + invoiceSubtotal(i), 0);
  const quoteTotal = quoteItems.reduce((s, i) => s + i.price * i.qty, 0);
  const total = docType === "invoice" ? invoiceTotal : quoteTotal;

  const paymentRows: [string, string][] = [
    ["Bank Name", bankName], ["Bank Address", bankAddress],
    ["Bank Country of Origin", bankCountry], ["Account Holder Name", accHolder],
    ["Account Holder Address", accAddress], ["Bank Account No", accNo],
    ["Bank Swift Code", swift], ["Bank Code", bankCode], ["Branch Code", branchCode],
  ];

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const buildSnapshot = () => ({
    docType, fromName, fromAddress, clientName, dateIssued, dueDate, paymentStatus, rate, totalTasks,
    items, companyName, projectName, docNo, quoteItems,
    bankName, bankAddress, bankCountry, accHolder, accAddress, accNo, swift, bankCode, branchCode,
    contactName, contactEmail, contactPhone,
  });

  const handleSave = () => {
    saveDoc({
      type: docType,
      clientName: docType === "quotation" ? companyName : clientName,
      dateIssued,
      dueDate: docType === "invoice" ? dueDate || undefined : undefined,
      status: "unpaid",
      total,
      snapshot: buildSnapshot(),
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!supabase) return;
    setShareBusy(true);
    setShareUrl(null);
    const { data, error } = await supabase
      .from("shared_invoices")
      .insert({ snapshot: buildSnapshot() })
      .select("id")
      .single();
    if (!error && data) {
      const url = `${window.location.origin}/invoice/share/${data.id}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
    }
    setShareBusy(false);
  };

  return (
    <ShellLayout>
      <PageHeader
        title="Template Invoice"
        subtitle="Invoice & Quotation builder"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => router.push("/invoice/history")}>
              <Icon name="history" size={15} /> History
            </Button>
            <Button variant="outline" onClick={handleSave}><Icon name="save" size={15} /> Save</Button>
            <Button variant="outline" onClick={handleShare} disabled={shareBusy}>
              <Icon name="link" size={15} /> {shareBusy ? "Membuat link…" : "Share Link"}
            </Button>
            <Button onClick={handlePrint}><Icon name="download" size={15} /> Export PDF</Button>
          </div>
        }
      />

      {/* Share URL banner */}
      {shareUrl && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--color-primary-light)", border: "1px solid var(--color-primary-muted)" }}>
          <Icon name="check-circle" size={16} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
          <p className="text-[13px] font-medium flex-1 truncate" style={{ color: "var(--color-primary-ink)" }}>
            Link tersalin: <span className="font-semibold">{shareUrl}</span>
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="text-[12px] font-semibold px-3 py-1 rounded-lg transition-opacity hover:opacity-70 flex-shrink-0"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            Salin Lagi
          </button>
          <button onClick={() => setShareUrl(null)} style={{ color: "var(--color-muted)" }}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-5 items-start">
        {/* ── LEFT: FORM ── */}
        <div className="rounded-[14px] border p-6 flex flex-col gap-5" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>

          {/* Document type */}
          <div>
            <label className={FIELD_LABEL} style={labelStyle}>Document Type</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(["invoice", "quotation"] as DocumentType[]).map(t => (
                <button key={t} onClick={() => setDocType(t)} className="py-2.5 rounded-[8px] text-sm font-semibold capitalize transition-all border"
                  style={docType === t
                    ? { background: "var(--color-primary-light)", borderColor: "var(--color-primary)", color: "var(--color-primary-ink)" }
                    : { background: "var(--color-surface)", borderColor: "var(--color-hairline)", color: "var(--color-muted)" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* From */}
          <div className="pt-5" style={divider}>
            <label className={FIELD_LABEL} style={labelStyle}>From</label>
            <div className="flex flex-col gap-2">
              <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your name" className="bg-[var(--color-surface)]" />
              <Textarea value={fromAddress} onChange={e => setFromAddress(e.target.value)} rows={2} placeholder="Address" className="bg-[var(--color-surface)]" />
            </div>
          </div>

          {/* Meta */}
          <div className="pt-5" style={divider}>
            <div className="flex flex-col gap-3">
              {docType === "quotation" ? (
                <>
                  <div>
                    <label className={FIELD_LABEL} style={labelStyle}>To (Recipient)</label>
                    <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Recipient name" className="bg-[var(--color-surface)]" />
                  </div>
                  <div>
                    <label className={FIELD_LABEL} style={labelStyle}>Company</label>
                    <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company name" className="bg-[var(--color-surface)]" />
                  </div>
                  <div>
                    <label className={FIELD_LABEL} style={labelStyle}>Project</label>
                    <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project name" className="bg-[var(--color-surface)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={FIELD_LABEL} style={labelStyle}>Document No.</label>
                      <Input value={docNo} onChange={e => setDocNo(e.target.value)} placeholder="BK/Q/2026/0001" className="bg-[var(--color-surface)]" />
                    </div>
                    <div>
                      <label className={FIELD_LABEL} style={labelStyle}>Date</label>
                      <Input type="date" value={dateIssued} onChange={e => setDateIssued(e.target.value)} className="bg-[var(--color-surface)]" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={FIELD_LABEL} style={labelStyle}>Bill To (Client)</label>
                    <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" className="bg-[var(--color-surface)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={FIELD_LABEL} style={labelStyle}>Date Issued</label>
                      <Input type="date" value={dateIssued} onChange={e => setDateIssued(e.target.value)} className="bg-[var(--color-surface)]" />
                    </div>
                    <div>
                      <label className={FIELD_LABEL} style={labelStyle}>Jatuh Tempo</label>
                      <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[var(--color-surface)]" />
                    </div>
                  </div>
                  <div>
                    <label className={FIELD_LABEL} style={labelStyle}>Payment Status</label>
                    <Select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="bg-[var(--color-surface)]">
                      <option>Waiting for payment</option>
                      <option>Paid</option>
                      <option>Overdue</option>
                      <option>Partially paid</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={FIELD_LABEL} style={labelStyle}>Rate / Hour (IDR)</label>
                      <Input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="bg-[var(--color-surface)]" />
                    </div>
                    <div>
                      <label className={FIELD_LABEL} style={labelStyle}>Total Tasks</label>
                      <Input type="number" value={totalTasks} onChange={e => setTotalTasks(Number(e.target.value))} className="bg-[var(--color-surface)]" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="pt-5" style={divider}>
            <label className={FIELD_LABEL} style={labelStyle}>
              {docType === "quotation" ? "Services / Items" : "Line Items"}
            </label>
            <div className="flex flex-col gap-3">
              {docType === "invoice" ? (
                <>
                  {items.map((item, idx) => (
                    <div key={item.id} className="rounded-[10px] border p-3 flex flex-col gap-2" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold" style={{ color: "var(--color-muted)" }}>Item {idx + 1}</span>
                        {items.length > 1 && (
                          <button onClick={() => removeItem(item.id)} className="p-1 rounded hover:bg-red-50" style={{ color: "#C64545" }}><Icon name="trash" size={13} /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={item.date} onChange={e => updateItem(item.id, "date", e.target.value)} className="bg-[var(--color-surface-card)]" />
                        <Input type="number" value={item.hours || ""} onChange={e => updateItem(item.id, "hours", Number(e.target.value))} placeholder="Hours" className="bg-[var(--color-surface-card)]" />
                      </div>
                      <Input value={item.project} onChange={e => updateItem(item.id, "project", e.target.value)} placeholder="Project name" className="bg-[var(--color-surface-card)]" />
                      <Input value={item.title} onChange={e => updateItem(item.id, "title", e.target.value)} placeholder="Heading (optional)" className="bg-[var(--color-surface-card)]" />
                      <Textarea value={item.tasks} onChange={e => updateItem(item.id, "tasks", e.target.value)} rows={3} placeholder="One task per line" className="bg-[var(--color-surface-card)]" />
                    </div>
                  ))}
                  <button onClick={addItem} className="flex items-center gap-2 text-sm font-semibold mt-1 hover:opacity-70 w-fit" style={{ color: "var(--color-primary)" }}>
                    <Icon name="plus" size={14} /> Add Item
                  </button>
                </>
              ) : (
                <>
                  {quoteItems.map((item, idx) => (
                    <div key={item.id} className="rounded-[10px] border p-3 flex flex-col gap-2" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold" style={{ color: "var(--color-muted)" }}>Item {idx + 1}</span>
                        {quoteItems.length > 1 && (
                          <button onClick={() => removeQuoteItem(item.id)} className="p-1 rounded hover:bg-red-50" style={{ color: "#C64545" }}><Icon name="trash" size={13} /></button>
                        )}
                      </div>
                      <Input value={item.service} onChange={e => updateQuoteItem(item.id, "service", e.target.value)} placeholder="Service (e.g. Website)" className="bg-[var(--color-surface-card)]" />
                      <Input value={item.description} onChange={e => updateQuoteItem(item.id, "description", e.target.value)} placeholder="Description / title" className="bg-[var(--color-surface-card)]" />
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-muted)" }}>Package items (one per line)</label>
                        <Textarea value={item.packageItems} onChange={e => updateQuoteItem(item.id, "packageItems", e.target.value)} rows={4} placeholder="Homepage Refinement&#10;Responsive Homepage&#10;..." className="bg-[var(--color-surface-card)]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-muted)" }}>Includes (one per line)</label>
                        <Textarea value={item.includes} onChange={e => updateQuoteItem(item.id, "includes", e.target.value)} rows={2} placeholder="Interaction & animation setup&#10;..." className="bg-[var(--color-surface-card)]" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-muted)" }}>Price (IDR)</label>
                          <Input type="number" value={item.price || ""} onChange={e => updateQuoteItem(item.id, "price", Number(e.target.value))} placeholder="4000000" className="bg-[var(--color-surface-card)]" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-muted)" }}>Qty</label>
                          <Input type="number" value={item.qty || ""} onChange={e => updateQuoteItem(item.id, "qty", Number(e.target.value))} placeholder="1" className="bg-[var(--color-surface-card)]" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addQuoteItem} className="flex items-center gap-2 text-sm font-semibold mt-1 hover:opacity-70 w-fit" style={{ color: "var(--color-primary)" }}>
                    <Icon name="plus" size={14} /> Add Service
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Payment info */}
          <div className="pt-5" style={divider}>
            <label className={FIELD_LABEL} style={labelStyle}>Payment Information</label>
            <div className="flex flex-col gap-2">
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name" className="bg-[var(--color-surface)]" />
              <Textarea value={bankAddress} onChange={e => setBankAddress(e.target.value)} rows={2} className="bg-[var(--color-surface)]" />
              <Input value={bankCountry} onChange={e => setBankCountry(e.target.value)} className="bg-[var(--color-surface)]" />
              <Input value={accHolder} onChange={e => setAccHolder(e.target.value)} className="bg-[var(--color-surface)]" />
              <Input value={accAddress} onChange={e => setAccAddress(e.target.value)} className="bg-[var(--color-surface)]" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={accNo} onChange={e => setAccNo(e.target.value)} className="bg-[var(--color-surface)]" />
                <Input value={swift} onChange={e => setSwift(e.target.value)} className="bg-[var(--color-surface)]" />
                <Input value={bankCode} onChange={e => setBankCode(e.target.value)} className="bg-[var(--color-surface)]" />
                <Input value={branchCode} onChange={e => setBranchCode(e.target.value)} className="bg-[var(--color-surface)]" />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="pt-5" style={divider}>
            <label className={FIELD_LABEL} style={labelStyle}>Questions / Contact</label>
            <div className="flex flex-col gap-2">
              <Input value={contactName} onChange={e => setContactName(e.target.value)} className="bg-[var(--color-surface)]" />
              <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="bg-[var(--color-surface)]" />
              <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="bg-[var(--color-surface)]" />
            </div>
          </div>
        </div>

        {/* ── RIGHT: LIVE PREVIEW ── */}
        <div className="rounded-[14px] border overflow-hidden shadow-sm sticky top-6" style={{ borderColor: "var(--color-hairline)", maxHeight: "calc(100vh - 48px)", overflowY: "auto" }}>
          <div id="invoice-print-area" className="printable bg-white text-[#1A1A1A] px-10 py-12">
            {docType === "invoice" ? (
              <InvoicePreview
                fromName={fromName} fromAddress={fromAddress} clientName={clientName}
                dateIssued={dateIssued} paymentStatus={paymentStatus} totalTasks={totalTasks}
                items={items} rate={rate} total={invoiceTotal}
                paymentRows={paymentRows} contactName={contactName} contactEmail={contactEmail} contactPhone={contactPhone}
              />
            ) : (
              <QuotationPreview
                fromName={fromName} clientName={clientName} companyName={companyName}
                projectName={projectName} docNo={docNo} dateIssued={dateIssued}
                quoteItems={quoteItems} total={quoteTotal}
                paymentRows={paymentRows} contactName={contactName} contactEmail={contactEmail} contactPhone={contactPhone}
              />
            )}
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}

// ─── Invoice preview component ────────────────────────────────────
function InvoicePreview({ fromName, fromAddress, clientName, dateIssued, paymentStatus, totalTasks, items, rate, total, paymentRows, contactName, contactEmail, contactPhone }: {
  fromName: string; fromAddress: string; clientName: string; dateIssued: string; paymentStatus: string;
  totalTasks: number; items: LineItem[]; rate: number; total: number;
  paymentRows: [string, string][]; contactName: string; contactEmail: string; contactPhone: string;
}) {
  const subtotalOf = (item: LineItem) => item.hours * rate;
  const bullets = (t: string) => t.split("\n").map(s => s.trim()).filter(Boolean);

  return (
    <>
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-[14px] font-semibold mb-1">{fromName || "Your Name"}</p>
          {fromAddress.split("\n").map((line, i) => <p key={i} className="text-[13px] text-[#555]">{line}</p>)}
        </div>
        <p className="text-[34px] font-semibold tracking-tight text-[#555]">Invoice</p>
      </div>
      <div className="border-t border-[#E5E5E5] mb-7" />
      <div className="grid grid-cols-3 gap-6 mb-7">
        <div>
          <p className="text-[13px] font-semibold mb-1">Bill To:</p>
          <p className="text-[17px] font-bold">{clientName || "Client"}</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold mb-1">Date Issued:</p>
          {dateIssued && <>
            <p className="text-[14px]">{format(new Date(dateIssued), "EEEE,")}</p>
            <p className="text-[14px]">{format(new Date(dateIssued), "d MMMM yyyy")}</p>
          </>}
        </div>
        <div>
          <p className="text-[13px] font-semibold mb-1">Payment Status:</p>
          <p className="text-[14px]">{paymentStatus}</p>
        </div>
      </div>
      <div className="border-t border-[#E5E5E5] mb-5" />
      <div className="flex items-start gap-4 pb-4">
        <p className="flex-1 text-[14px] font-semibold">Total task: {totalTasks}</p>
        <p className="w-[120px] text-[14px] font-semibold">Project Name</p>
        <p className="w-[90px] text-[14px] font-semibold">Total Hours</p>
        <p className="w-[120px] text-[14px] font-semibold text-right">Sub Total (IDR)</p>
      </div>
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-4 py-4 border-t border-[#EFEFEF]">
          <div className="flex-1 min-w-0">
            {item.date && <p className="text-[12px] text-[#888] mb-1.5">{format(new Date(item.date), "d MMMM yyyy")}</p>}
            {item.title && <p className="text-[14px] mb-1">{item.title}</p>}
            <ul className="flex flex-col gap-0.5">
              {bullets(item.tasks).map((b, i) => (
                <li key={i} className="text-[14px] flex gap-2"><span className="text-[#888] flex-shrink-0">•</span><span>{b}</span></li>
              ))}
            </ul>
          </div>
          <p className="w-[120px] text-[14px]">{item.project}</p>
          <p className="w-[90px] text-[14px]">{item.hours} Hours</p>
          <p className="w-[120px] text-[14px] text-right">{fmtIDR(subtotalOf(item))}</p>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-[#E5E5E5] pt-5 mt-1">
        <p className="text-[15px] font-semibold">Total</p>
        <p className="text-[15px] font-semibold">{fmtIDR(total)}</p>
      </div>
      <div className="border-t border-[#E5E5E5] mt-5 mb-8" />
      <div className="flex items-end justify-between gap-8">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold mb-2.5">Payments Information:</p>
          <div className="flex flex-col gap-1">
            {paymentRows.map(([label, value]) => (
              <div key={label} className="flex text-[13px] text-[#888]">
                <span className="w-[170px] flex-shrink-0">{label}</span>
                <span className="flex-1">: {value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[13px] font-semibold mb-1.5">Questions</p>
          <p className="text-[13px] text-[#555]">{contactName}</p>
          <p className="text-[13px] text-[#555]">{contactEmail}</p>
          <p className="text-[13px] text-[#555]">{contactPhone}</p>
        </div>
      </div>
    </>
  );
}

// ─── Quotation preview component ──────────────────────────────────
function QuotationPreview({ fromName, clientName, companyName, projectName, docNo, dateIssued, quoteItems, total, paymentRows, contactName, contactEmail, contactPhone }: {
  fromName: string; clientName: string; companyName: string; projectName: string;
  docNo: string; dateIssued: string; quoteItems: QuoteItem[]; total: number;
  paymentRows: [string, string][]; contactName: string; contactEmail: string; contactPhone: string;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div />
        <p className="text-[40px] font-bold tracking-widest uppercase" style={{ color: "#444", letterSpacing: "0.12em" }}>QUOTATION</p>
      </div>

      <div className="border-t border-[#E0E0E0] mb-6" />

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="flex flex-col gap-1.5">
          {[["To", clientName || "Recipient"], ["Company", companyName || "Company"], ["Project", projectName || "Project"]].map(([k, v]) => (
            <div key={k} className="flex gap-3 text-[13px]">
              <span className="font-bold w-20 flex-shrink-0">{k}</span>
              <span style={{ color: "#555" }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 text-right">
          {[["No.", docNo], ["Date", dateIssued ? format(new Date(dateIssued), "d MMM yyyy") : ""]].map(([k, v]) => (
            <div key={k} className="flex gap-3 text-[13px] justify-end">
              <span className="font-bold">{k}</span>
              <span style={{ color: "#555" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[36px_100px_1fr_130px_50px_110px] gap-2 py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ background: "#F5F5F5", borderRadius: 4 }}>
        <span>NO.</span>
        <span>SERVICE</span>
        <span>DESCRIPTION</span>
        <span>PRICE</span>
        <span>QTY</span>
        <span className="text-right">TOTAL</span>
      </div>

      {/* Quote items */}
      {quoteItems.map((item, idx) => (
        <div key={item.id} className="grid grid-cols-[36px_100px_1fr_130px_50px_110px] gap-2 py-4 px-3 border-b border-[#EFEFEF] items-start">
          <span className="text-[13px]">{idx + 1}</span>
          <span className="text-[13px]">{item.service}</span>
          <div className="text-[13px]">
            <p className="font-bold mb-2">{item.description}</p>
            {bullets(item.packageItems).length > 0 && (
              <>
                <p className="font-bold text-[12px] mb-1">Package:</p>
                {bullets(item.packageItems).map((b, i) => <p key={i} className="text-[#555] text-[12px]">- {b}</p>)}
              </>
            )}
            {bullets(item.includes).length > 0 && (
              <div className="mt-2">
                <p className="font-bold text-[12px] mb-1">Includes:</p>
                {bullets(item.includes).map((b, i) => <p key={i} className="text-[#555] text-[12px]">- {b}</p>)}
              </div>
            )}
          </div>
          <span className="text-[13px]">{fmtIDR(item.price)}</span>
          <span className="text-[13px]">{item.qty}</span>
          <span className="text-[13px] text-right">{fmtIDR(item.price * item.qty)}</span>
        </div>
      ))}

      {/* Total */}
      <div className="border-t-2 border-[#E0E0E0] mt-2" />
      <div className="grid grid-cols-[36px_100px_1fr_130px_50px_110px] gap-2 py-3.5 px-3 font-bold text-[14px]" style={{ background: "#F5F5F5" }}>
        <span /><span /><span />
        <span>TOTAL</span>
        <span>IDR</span>
        <span className="text-right">{new Intl.NumberFormat("en-US").format(total)}</span>
      </div>

      {/* Payment + Contact */}
      <div className="border-t border-[#E5E5E5] mt-8 mb-6" />
      <div className="flex items-start justify-between gap-8">
        <div className="flex-1">
          <p className="text-[13px] font-semibold mb-2">Payments Information:</p>
          {paymentRows.map(([label, value]) => (
            <div key={label} className="flex text-[12px] text-[#888]">
              <span className="w-[170px] flex-shrink-0">{label}</span>
              <span>: {value}</span>
            </div>
          ))}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[13px] font-semibold mb-1">Questions</p>
          <p className="text-[12px] text-[#555]">{contactName}</p>
          <p className="text-[12px] text-[#555]">{contactEmail}</p>
          <p className="text-[12px] text-[#555]">{contactPhone}</p>
        </div>
      </div>
    </>
  );
}
