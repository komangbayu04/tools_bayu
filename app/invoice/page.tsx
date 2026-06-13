"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useState } from "react";
import { Plus, Trash2, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type DocumentType = "invoice" | "quotation";
type Currency = "IDR" | "USD" | "SGD";

interface LineItem {
  id: string;
  desc: string;
  qty: number;
  unit_price: number;
}

const currencySymbol: Record<Currency, string> = { IDR: "Rp", USD: "$", SGD: "S$" };

function formatAmount(amount: number, currency: Currency) {
  if (currency === "IDR") return "Rp " + new Intl.NumberFormat("id-ID").format(amount);
  return currencySymbol[currency] + " " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(amount);
}

function newItem(): LineItem {
  return { id: crypto.randomUUID(), desc: "", qty: 1, unit_price: 0 };
}

const sectionLabel = "block text-[11px] font-semibold uppercase tracking-wider mb-2";
const labelStyle = { color: "var(--color-muted)" };
const sectionDivider = "pt-5 mt-1";

export default function InvoicePage() {
  const [docType, setDocType] = useState<DocumentType>("invoice");
  const [currency, setCurrency] = useState<Currency>("IDR");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(11);
  const [fromName, setFromName] = useState("Kamarupa Design Group");
  const [fromEmail, setFromEmail] = useState("hello@kamarupadg.com");
  const [fromAddress, setFromAddress] = useState("Jakarta, Indonesia");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([newItem()]);

  const docNumber = `${docType === "invoice" ? "INV" : "QUO"}-${new Date().getFullYear()}-001`;

  const addItem = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateItem = (id: string, field: keyof LineItem, value: string | number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const taxAmount = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + taxAmount;

  return (
    <ShellLayout>
      <PageHeader
        title="Template Invoice"
        subtitle="Build invoices & quotations with live preview"
        actions={
          <>
            <Button variant="outline"><Save size={15} /> Save</Button>
            <Button><Download size={15} /> Export PDF</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT: Form */}
        <div
          className="rounded-[14px] border p-6 flex flex-col gap-5"
          style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}
        >
          {/* Document type */}
          <div>
            <label className={sectionLabel} style={labelStyle}>Document Type</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(["invoice", "quotation"] as DocumentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  className="py-2.5 rounded-[8px] text-sm font-semibold capitalize transition-all border"
                  style={
                    docType === t
                      ? { background: "var(--color-primary-light)", borderColor: "#2A9D8F", color: "#1C4F4F" }
                      : { background: "var(--color-surface)", borderColor: "var(--color-hairline)", color: "var(--color-muted)" }
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className={sectionLabel} style={labelStyle}>Currency</label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="bg-[var(--color-surface)]">
              <option value="IDR">IDR — Indonesian Rupiah</option>
              <option value="USD">USD — US Dollar</option>
              <option value="SGD">SGD — Singapore Dollar</option>
            </Select>
          </div>

          {/* From */}
          <div className={sectionDivider} style={{ borderTop: "1px solid var(--color-hairline)" }}>
            <label className={sectionLabel} style={labelStyle}>From</label>
            <div className="flex flex-col gap-2">
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Company name" className="bg-[var(--color-surface)]" />
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="Email" className="bg-[var(--color-surface)]" />
              <Input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="Address" className="bg-[var(--color-surface)]" />
            </div>
          </div>

          {/* To */}
          <div className={sectionDivider} style={{ borderTop: "1px solid var(--color-hairline)" }}>
            <label className={sectionLabel} style={labelStyle}>To (Client)</label>
            <div className="flex flex-col gap-2">
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className="bg-[var(--color-surface)]" />
              <Input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="Company (optional)" className="bg-[var(--color-surface)]" />
              <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Email" className="bg-[var(--color-surface)]" />
            </div>
          </div>

          {/* Dates */}
          <div className={sectionDivider} style={{ borderTop: "1px solid var(--color-hairline)" }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={sectionLabel} style={labelStyle}>Issue Date</label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="bg-[var(--color-surface)]" />
              </div>
              <div>
                <label className={sectionLabel} style={labelStyle}>Due Date</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-[var(--color-surface)]" />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className={sectionDivider} style={{ borderTop: "1px solid var(--color-hairline)" }}>
            <label className={sectionLabel} style={labelStyle}>Line Items</label>
            <div className="flex flex-col gap-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <Input value={item.desc} onChange={(e) => updateItem(item.id, "desc", e.target.value)} placeholder={`Item ${idx + 1} description`} className="flex-1 bg-[var(--color-surface)]" />
                  <Input type="number" value={item.qty} onChange={(e) => updateItem(item.id, "qty", Number(e.target.value))} min={1} className="w-16 bg-[var(--color-surface)]" />
                  <Input type="number" value={item.unit_price || ""} onChange={(e) => updateItem(item.id, "unit_price", Number(e.target.value))} placeholder="Price" className="w-28 bg-[var(--color-surface)]" />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(item.id)} className="p-2.5 rounded-[8px] transition-colors hover:bg-red-50" style={{ color: "#C64545" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addItem} className="flex items-center gap-2 text-sm font-semibold mt-1 hover:opacity-70 transition-opacity w-fit" style={{ color: "#2A9D8F" }}>
                <Plus size={14} /> Add Item
              </button>
            </div>
          </div>

          {/* Tax */}
          <div className={sectionDivider} style={{ borderTop: "1px solid var(--color-hairline)" }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={labelStyle}>Tax (PPN)</label>
              <button
                onClick={() => setTaxEnabled(!taxEnabled)}
                className="w-10 h-[22px] rounded-full transition-colors relative"
                style={{ background: taxEnabled ? "#2A9D8F" : "var(--color-hairline)" }}
              >
                <span className="absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform" style={{ transform: taxEnabled ? "translateX(20px)" : "translateX(2px)" }} />
              </button>
            </div>
            {taxEnabled && (
              <div className="flex items-center gap-2">
                <Input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} min={0} max={100} className="w-20 bg-[var(--color-surface)]" />
                <span className="text-sm" style={{ color: "var(--color-muted)" }}>%</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className={sectionDivider} style={{ borderTop: "1px solid var(--color-hairline)" }}>
            <label className={sectionLabel} style={labelStyle}>Notes / Terms</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Payment terms, thank you notes…" className="bg-[var(--color-surface)]" />
          </div>
        </div>

        {/* RIGHT: Live preview (paper — always light) */}
        <div className="lg:sticky lg:top-0 lg:self-start">
          <div className="rounded-[14px] border overflow-hidden shadow-sm" style={{ borderColor: "var(--color-hairline)" }}>
            <div className="bg-white p-8 text-[#1A2B32]">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#1C4F4F] flex items-center justify-center mb-3">
                    <span className="text-white font-bold text-lg">L</span>
                  </div>
                  <p className="text-sm font-semibold">{fromName || "Company Name"}</p>
                  <p className="text-xs text-[#7A9099]">{fromEmail}</p>
                  <p className="text-xs text-[#7A9099]">{fromAddress}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#1C4F4F] uppercase">{docType}</p>
                  <p className="text-sm font-mono text-[#7A9099] mt-1">{docNumber}</p>
                </div>
              </div>

              {/* Bill to / dates */}
              <div className="grid grid-cols-2 gap-6 mb-8 pb-6 border-b border-[#E5E9EB]">
                <div>
                  <p className="text-[11px] font-semibold text-[#7A9099] uppercase tracking-wider mb-2">Bill To</p>
                  <p className="text-sm font-semibold">{clientName || "Client Name"}</p>
                  {clientCompany && <p className="text-xs text-[#7A9099]">{clientCompany}</p>}
                  {clientEmail && <p className="text-xs text-[#7A9099]">{clientEmail}</p>}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#7A9099] uppercase tracking-wider">Issue Date</p>
                  <p className="text-sm mb-2">{issueDate || "—"}</p>
                  {dueDate && (
                    <>
                      <p className="text-[11px] font-semibold text-[#7A9099] uppercase tracking-wider">Due Date</p>
                      <p className="text-sm">{dueDate}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Table */}
              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b border-[#E5E9EB]">
                    <th className="text-left text-[11px] font-semibold text-[#7A9099] uppercase tracking-wider pb-2 pr-4">Description</th>
                    <th className="text-center text-[11px] font-semibold text-[#7A9099] uppercase tracking-wider pb-2 w-12">Qty</th>
                    <th className="text-right text-[11px] font-semibold text-[#7A9099] uppercase tracking-wider pb-2 w-28">Unit Price</th>
                    <th className="text-right text-[11px] font-semibold text-[#7A9099] uppercase tracking-wider pb-2 w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F7]">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-4 text-sm">{item.desc || <span className="text-[#A8BDC3]">Item description</span>}</td>
                      <td className="py-2.5 text-sm text-[#3D5159] text-center">{item.qty}</td>
                      <td className="py-2.5 text-sm text-[#3D5159] text-right">{formatAmount(item.unit_price, currency)}</td>
                      <td className="py-2.5 text-sm font-medium text-right">{formatAmount(item.qty * item.unit_price, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-[#E5E9EB] pt-4 ml-auto w-64 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A9099]">Subtotal</span>
                  <span className="font-medium">{formatAmount(subtotal, currency)}</span>
                </div>
                {taxEnabled && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#7A9099]">Tax ({taxRate}%)</span>
                    <span className="font-medium">{formatAmount(taxAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-[#E5E9EB]">
                  <span className="text-[#1C4F4F]">Total</span>
                  <span className="text-[#1C4F4F]">{formatAmount(total, currency)}</span>
                </div>
              </div>

              {notes && (
                <div className="mt-8 pt-6 border-t border-[#E5E9EB]">
                  <p className="text-[11px] font-semibold text-[#7A9099] uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-[#3D5159] whitespace-pre-wrap">{notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}
