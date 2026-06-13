"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useState } from "react";
import { Plus, Trash2, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

type DocumentType = "invoice" | "quotation";

interface LineItem {
  id: string;
  date: string;        // ISO date
  title: string;       // optional heading
  tasks: string;       // newline-separated bullets
  project: string;
  hours: number;
}

const newItem = (): LineItem => ({
  id: crypto.randomUUID(), date: "", title: "", tasks: "", project: "", hours: 0,
});

const SAMPLE_ITEMS: LineItem[] = [
  { id: "1", date: "2026-04-26", title: "Refine & Created UX flow", tasks: "Bathing (dekstop & mobile)\nDining & Packages (dekstop & mobile)\nGift cards (Dekstop)", project: "Zora Springs", hours: 6 },
  { id: "2", date: "2026-04-27", title: "", tasks: "Create mobile version for gift cards & check out\nNavbar refinement\nHero page option + first section (to get right visual direction)", project: "Zora Springs", hours: 6 },
  { id: "3", date: "2026-04-30", title: "", tasks: "Refine ux booking flow\nSitemap design", project: "Zora Springs", hours: 2 },
  { id: "4", date: "2026-05-02", title: "", tasks: "Local pass flow & guest pass flow", project: "Zora Springs", hours: 5 },
  { id: "5", date: "2026-05-09", title: "", tasks: "Content structure, UX Copy + Wireframe", project: "Zora Springs", hours: 6 },
  { id: "6", date: "2026-05-11", title: "", tasks: "Complate Content structure, UX Copy + Wireframe", project: "Zora Springs", hours: 1 },
  { id: "7", date: "2026-05-23", title: "", tasks: "Competitive WA UI Reference Board & WhatsApp Interaction Layout Spec", project: "Nex Healthcare", hours: 3 },
  { id: "8", date: "2026-05-26", title: "", tasks: "Zora Spring mockup lifeguard & tradie, & refinement foto", project: "Nex Healthcare", hours: 4 },
  { id: "9", date: "2026-05-28", title: "", tasks: "Nex Healthcare & Nex Life review & feedback", project: "Nex Healthcare", hours: 3 },
  { id: "10", date: "2026-06-09", title: "", tasks: "Nex Healthcare GTM create V1 clinic receptionist & super admin", project: "Nex Healthcare", hours: 3 },
  { id: "11", date: "2026-06-13", title: "", tasks: "Nex Healthcare GTM, Mapping design & refinement (figjam) according new IA\nCreate for owner view", project: "Nex Healthcare", hours: 5 },
];

const fmtIDR = (n: number) => "IDR" + new Intl.NumberFormat("en-US").format(n);
const bullets = (tasks: string) => tasks.split("\n").map((t) => t.trim()).filter(Boolean);

const FIELD_LABEL = "block text-[11px] font-semibold uppercase tracking-wider mb-1.5";
const labelStyle = { color: "var(--color-muted)" };
const divider = { borderTop: "1px solid var(--color-hairline)" };

export default function InvoicePage() {
  const [docType, setDocType] = useState<DocumentType>("invoice");

  // Sender
  const [fromName, setFromName] = useState("Bayu Krisnayana");
  const [fromAddress, setFromAddress] = useState("Jln. Dewi Sartika No.19, Semarapura Kaja, Klungkung\nBali, Indonesia, 80711");

  // Meta
  const [clientName, setClientName] = useState("Exo Digital");
  const [dateIssued, setDateIssued] = useState("2026-06-15");
  const [paymentStatus, setPaymentStatus] = useState("Waiting for payment");
  const [rate, setRate] = useState(100000);
  const [totalTasks, setTotalTasks] = useState(28);

  const [items, setItems] = useState<LineItem[]>(SAMPLE_ITEMS);

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

  // Questions / contact
  const [contactName, setContactName] = useState("Bayu Krisnayana");
  const [contactEmail, setContactEmail] = useState("bayuajoes321@gmail.com");
  const [contactPhone, setContactPhone] = useState("+6285 792 352 806");

  const addItem = () => setItems((p) => [...p, newItem()]);
  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const updateItem = (id: string, field: keyof LineItem, value: string | number) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const subtotalOf = (item: LineItem) => item.hours * rate;
  const total = items.reduce((s, i) => s + subtotalOf(i), 0);

  const paymentRows: [string, string][] = [
    ["Bank Name", bankName],
    ["Bank Address", bankAddress],
    ["Bank Country of Origin", bankCountry],
    ["Account Holder Name", accHolder],
    ["Account Holder Address", accAddress],
    ["Bank Account No", accNo],
    ["Bank Swift Code", swift],
    ["Bank Code", bankCode],
    ["Branch Code", branchCode],
  ];

  return (
    <ShellLayout>
      <PageHeader
        title="Template Invoice"
        subtitle="Time-tracked invoice with live preview"
        actions={
          <>
            <Button variant="outline"><Save size={15} /> Save</Button>
            <Button><Download size={15} /> Export PDF</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-5 items-start">
        {/* ---------- LEFT: FORM ---------- */}
        <div className="rounded-[14px] border p-6 flex flex-col gap-5" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
          {/* Document type */}
          <div>
            <label className={FIELD_LABEL} style={labelStyle}>Document Type</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(["invoice", "quotation"] as DocumentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  className="py-2.5 rounded-[8px] text-sm font-semibold capitalize transition-all border"
                  style={docType === t
                    ? { background: "var(--color-primary-light)", borderColor: "#2A9D8F", color: "#1C4F4F" }
                    : { background: "var(--color-surface)", borderColor: "var(--color-hairline)", color: "var(--color-muted)" }}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* From */}
          <div className="pt-5" style={divider}>
            <label className={FIELD_LABEL} style={labelStyle}>From</label>
            <div className="flex flex-col gap-2">
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your name" className="bg-[var(--color-surface)]" />
              <Textarea value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} rows={2} placeholder="Address" className="bg-[var(--color-surface)]" />
            </div>
          </div>

          {/* Meta */}
          <div className="pt-5" style={divider}>
            <div className="flex flex-col gap-3">
              <div>
                <label className={FIELD_LABEL} style={labelStyle}>Bill To (Client)</label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className="bg-[var(--color-surface)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={FIELD_LABEL} style={labelStyle}>Date Issued</label>
                  <Input type="date" value={dateIssued} onChange={(e) => setDateIssued(e.target.value)} className="bg-[var(--color-surface)]" />
                </div>
                <div>
                  <label className={FIELD_LABEL} style={labelStyle}>Payment Status</label>
                  <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="bg-[var(--color-surface)]">
                    <option>Waiting for payment</option>
                    <option>Paid</option>
                    <option>Overdue</option>
                    <option>Partially paid</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={FIELD_LABEL} style={labelStyle}>Rate / Hour (IDR)</label>
                  <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="bg-[var(--color-surface)]" />
                </div>
                <div>
                  <label className={FIELD_LABEL} style={labelStyle}>Total Tasks</label>
                  <Input type="number" value={totalTasks} onChange={(e) => setTotalTasks(Number(e.target.value))} className="bg-[var(--color-surface)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="pt-5" style={divider}>
            <label className={FIELD_LABEL} style={labelStyle}>Line Items</label>
            <div className="flex flex-col gap-3">
              {items.map((item, idx) => (
                <div key={item.id} className="rounded-[10px] border p-3 flex flex-col gap-2" style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold" style={{ color: "var(--color-muted)" }}>Item {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="p-1 rounded hover:bg-red-50 transition-colors" style={{ color: "#C64545" }}><Trash2 size={13} /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={item.date} onChange={(e) => updateItem(item.id, "date", e.target.value)} className="bg-[var(--color-surface-card)]" />
                    <Input type="number" value={item.hours || ""} onChange={(e) => updateItem(item.id, "hours", Number(e.target.value))} placeholder="Hours" className="bg-[var(--color-surface-card)]" />
                  </div>
                  <Input value={item.project} onChange={(e) => updateItem(item.id, "project", e.target.value)} placeholder="Project name" className="bg-[var(--color-surface-card)]" />
                  <Input value={item.title} onChange={(e) => updateItem(item.id, "title", e.target.value)} placeholder="Heading (optional)" className="bg-[var(--color-surface-card)]" />
                  <Textarea value={item.tasks} onChange={(e) => updateItem(item.id, "tasks", e.target.value)} rows={3} placeholder="One task per line (each becomes a bullet)" className="bg-[var(--color-surface-card)]" />
                </div>
              ))}
              <button onClick={addItem} className="flex items-center gap-2 text-sm font-semibold mt-1 hover:opacity-70 transition-opacity w-fit" style={{ color: "#2A9D8F" }}>
                <Plus size={14} /> Add Item
              </button>
            </div>
          </div>

          {/* Payment info */}
          <div className="pt-5" style={divider}>
            <label className={FIELD_LABEL} style={labelStyle}>Payment Information</label>
            <div className="flex flex-col gap-2">
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" className="bg-[var(--color-surface)]" />
              <Textarea value={bankAddress} onChange={(e) => setBankAddress(e.target.value)} rows={2} placeholder="Bank address" className="bg-[var(--color-surface)]" />
              <Input value={bankCountry} onChange={(e) => setBankCountry(e.target.value)} placeholder="Country of origin" className="bg-[var(--color-surface)]" />
              <Input value={accHolder} onChange={(e) => setAccHolder(e.target.value)} placeholder="Account holder name" className="bg-[var(--color-surface)]" />
              <Input value={accAddress} onChange={(e) => setAccAddress(e.target.value)} placeholder="Account holder address" className="bg-[var(--color-surface)]" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={accNo} onChange={(e) => setAccNo(e.target.value)} placeholder="Account no" className="bg-[var(--color-surface)]" />
                <Input value={swift} onChange={(e) => setSwift(e.target.value)} placeholder="Swift code" className="bg-[var(--color-surface)]" />
                <Input value={bankCode} onChange={(e) => setBankCode(e.target.value)} placeholder="Bank code" className="bg-[var(--color-surface)]" />
                <Input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="Branch code" className="bg-[var(--color-surface)]" />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="pt-5" style={divider}>
            <label className={FIELD_LABEL} style={labelStyle}>Questions / Contact</label>
            <div className="flex flex-col gap-2">
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Name" className="bg-[var(--color-surface)]" />
              <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" className="bg-[var(--color-surface)]" />
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone" className="bg-[var(--color-surface)]" />
            </div>
          </div>
        </div>

        {/* ---------- RIGHT: LIVE PREVIEW (paper) ---------- */}
        <div className="rounded-[14px] border overflow-hidden shadow-sm" style={{ borderColor: "var(--color-hairline)" }}>
          <div className="bg-white text-[#1A1A1A] px-10 py-12" style={{ fontFeatureSettings: "'tnum'" }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-10">
              <div>
                <p className="text-[14px] font-semibold mb-1">{fromName || "Your Name"}</p>
                {fromAddress.split("\n").map((line, i) => (
                  <p key={i} className="text-[13px] text-[#555]">{line}</p>
                ))}
              </div>
              <p className="text-[34px] font-semibold tracking-tight capitalize">{docType}</p>
            </div>

            <div className="border-t border-[#E5E5E5] mb-7" />

            {/* Meta row */}
            <div className="grid grid-cols-3 gap-6 mb-7">
              <div>
                <p className="text-[13px] font-semibold mb-1">Bill To:</p>
                <p className="text-[17px] font-bold">{clientName || "Client"}</p>
              </div>
              <div>
                <p className="text-[13px] font-semibold mb-1">Date Issued:</p>
                {dateIssued && (
                  <>
                    <p className="text-[14px]">{format(new Date(dateIssued), "EEEE,")}</p>
                    <p className="text-[14px]">{format(new Date(dateIssued), "d MMMM yyyy")}</p>
                  </>
                )}
              </div>
              <div>
                <p className="text-[13px] font-semibold mb-1">Payment Status:</p>
                <p className="text-[14px]">{paymentStatus}</p>
              </div>
            </div>

            <div className="border-t border-[#E5E5E5] mb-5" />

            {/* Table header */}
            <div className="flex items-start gap-4 pb-4">
              <p className="flex-1 text-[14px] font-semibold">Total task: {totalTasks}</p>
              <p className="w-[120px] text-[14px] font-semibold">Project Name</p>
              <p className="w-[90px] text-[14px] font-semibold">Total Hours</p>
              <p className="w-[120px] text-[14px] font-semibold text-right">Sub Total (IDR)</p>
            </div>

            {/* Line items */}
            <div>
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 py-4 border-t border-[#EFEFEF]">
                  <div className="flex-1 min-w-0">
                    {item.date && <p className="text-[12px] text-[#888] mb-1.5">{format(new Date(item.date), "d MMMM yyyy")}</p>}
                    {item.title && <p className="text-[14px] mb-1">{item.title}</p>}
                    <ul className="flex flex-col gap-0.5">
                      {bullets(item.tasks).map((b, i) => (
                        <li key={i} className="text-[14px] flex gap-2">
                          <span className="text-[#888] flex-shrink-0">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="w-[120px] text-[14px]">{item.project}</p>
                  <p className="w-[90px] text-[14px]">{item.hours} Hours</p>
                  <p className="w-[120px] text-[14px] text-right">{fmtIDR(subtotalOf(item))}</p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t border-[#E5E5E5] pt-5 mt-1">
              <p className="text-[15px] font-semibold">Total</p>
              <p className="text-[15px] font-semibold">{fmtIDR(total)}</p>
            </div>

            <div className="border-t border-[#E5E5E5] mt-5 mb-8" />

            {/* Payments info + Questions */}
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
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}
