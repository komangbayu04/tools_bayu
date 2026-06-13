"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { useState } from "react";
import { Plus, Trash2, Download, Save, ChevronDown } from "lucide-react";

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
  if (currency === "IDR") {
    return "Rp " + new Intl.NumberFormat("id-ID").format(amount);
  }
  return currencySymbol[currency] + " " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(amount);
}

function newItem(): LineItem {
  return { id: crypto.randomUUID(), desc: "", qty: 1, unit_price: 0 };
}

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
  const [docNumber] = useState(() => {
    const year = new Date().getFullYear();
    const prefix = docType === "invoice" ? "INV" : "QUO";
    return `${prefix}-${year}-001`;
  });

  const addItem = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const taxAmount = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + taxAmount;

  return (
    <ShellLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[42px] font-semibold text-[#1C4F4F] tracking-tight leading-tight">
          Template Invoice
        </h1>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-[10px] border border-[#E5E9EB] text-sm font-medium text-[#3D5159] hover:bg-[#F4F6F7] transition-colors">
            <Save size={15} /> Save
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#2A9D8F] text-white text-sm font-medium hover:bg-[#1E7268] transition-colors">
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-[1fr_1fr] gap-6 h-[calc(100vh-220px)] min-h-0">
        {/* LEFT: Form */}
        <div className="overflow-auto rounded-[14px] border border-[#E5E9EB] bg-[#F9FAFB] p-6 flex flex-col gap-5">
          {/* Document Type */}
          <div>
            <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Document Type</label>
            <div className="flex gap-3">
              {(["invoice", "quotation"] as DocumentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  className={`flex-1 py-2 rounded-[8px] text-sm font-semibold capitalize transition-colors border ${
                    docType === t
                      ? "bg-[#E0F0F0] border-[#2A9D8F] text-[#1C4F4F]"
                      : "bg-white border-[#E5E9EB] text-[#7A9099] hover:border-[#2A9D8F]"
                  }`}
                >
                  {t === "invoice" ? "Invoice" : "Quotation"}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Currency</label>
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full appearance-none bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm font-medium text-[#1A2B32] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30"
              >
                <option value="IDR">IDR — Indonesian Rupiah</option>
                <option value="USD">USD — US Dollar</option>
                <option value="SGD">SGD — Singapore Dollar</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8BDC3] pointer-events-none" />
            </div>
          </div>

          {/* From */}
          <div className="border-t border-[#E5E9EB] pt-5">
            <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-3">From</label>
            <div className="flex flex-col gap-2">
              <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Company name" className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
              <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="Email" className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
              <input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="Address" className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
            </div>
          </div>

          {/* To */}
          <div className="border-t border-[#E5E9EB] pt-5">
            <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-3">To (Client)</label>
            <div className="flex flex-col gap-2">
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
              <input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="Company (optional)" className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
              <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Email" className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
            </div>
          </div>

          {/* Dates */}
          <div className="border-t border-[#E5E9EB] pt-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Issue Date</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border-t border-[#E5E9EB] pt-5">
            <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-3">Line Items</label>
            <div className="flex flex-col gap-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input value={item.desc} onChange={(e) => updateItem(item.id, "desc", e.target.value)} placeholder={`Item ${idx + 1} description`} className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
                  </div>
                  <div className="w-16">
                    <input type="number" value={item.qty} onChange={(e) => updateItem(item.id, "qty", Number(e.target.value))} min={1} placeholder="Qty" className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
                  </div>
                  <div className="w-28">
                    <input type="number" value={item.unit_price || ""} onChange={(e) => updateItem(item.id, "unit_price", Number(e.target.value))} placeholder="Price" className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(item.id)} className="p-2 text-[#C64545] hover:bg-red-50 rounded-[8px] transition-colors mt-0.5">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addItem} className="flex items-center gap-2 text-sm font-medium text-[#2A9D8F] hover:text-[#1E7268] mt-1">
                <Plus size={14} /> Add Item
              </button>
            </div>
          </div>

          {/* Tax */}
          <div className="border-t border-[#E5E9EB] pt-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#7A9099] uppercase tracking-wide">Tax (PPN)</label>
              <button
                onClick={() => setTaxEnabled(!taxEnabled)}
                className={`w-10 h-5 rounded-full transition-colors ${taxEnabled ? "bg-[#2A9D8F]" : "bg-[#E5E9EB]"} relative`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${taxEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            {taxEnabled && (
              <div className="flex items-center gap-2">
                <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} min={0} max={100} className="w-20 bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
                <span className="text-sm text-[#7A9099]">%</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="border-t border-[#E5E9EB] pt-5">
            <label className="block text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Notes / Terms</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Payment terms, thank you notes..." className="w-full bg-white border border-[#E5E9EB] rounded-[8px] px-3 py-2 text-sm text-[#1A2B32] placeholder-[#A8BDC3] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30 resize-none" />
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="overflow-auto rounded-[14px] border border-[#E5E9EB] bg-white">
          <div className="p-8 min-h-full">
            {/* Invoice header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#1C4F4F] flex items-center justify-center mb-3">
                  <span className="text-white font-bold text-lg">L</span>
                </div>
                <p className="text-sm font-semibold text-[#1A2B32]">{fromName || "Company Name"}</p>
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
                <p className="text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Bill To</p>
                <p className="text-sm font-semibold text-[#1A2B32]">{clientName || "Client Name"}</p>
                {clientCompany && <p className="text-xs text-[#7A9099]">{clientCompany}</p>}
                {clientEmail && <p className="text-xs text-[#7A9099]">{clientEmail}</p>}
              </div>
              <div>
                <div className="mb-2">
                  <p className="text-xs font-semibold text-[#7A9099] uppercase tracking-wide">Issue Date</p>
                  <p className="text-sm text-[#1A2B32]">{issueDate || "—"}</p>
                </div>
                {dueDate && (
                  <div>
                    <p className="text-xs font-semibold text-[#7A9099] uppercase tracking-wide">Due Date</p>
                    <p className="text-sm text-[#1A2B32]">{dueDate}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Line items table */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-[#E5E9EB]">
                  <th className="text-left text-xs font-semibold text-[#7A9099] uppercase tracking-wide pb-2 pr-4">Description</th>
                  <th className="text-center text-xs font-semibold text-[#7A9099] uppercase tracking-wide pb-2 w-12">Qty</th>
                  <th className="text-right text-xs font-semibold text-[#7A9099] uppercase tracking-wide pb-2 w-28">Unit Price</th>
                  <th className="text-right text-xs font-semibold text-[#7A9099] uppercase tracking-wide pb-2 w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F6F7]">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 pr-4 text-sm text-[#1A2B32]">{item.desc || <span className="text-[#A8BDC3]">Item description</span>}</td>
                    <td className="py-2.5 text-sm text-[#3D5159] text-center">{item.qty}</td>
                    <td className="py-2.5 text-sm text-[#3D5159] text-right">{formatAmount(item.unit_price, currency)}</td>
                    <td className="py-2.5 text-sm font-medium text-[#1A2B32] text-right">{formatAmount(item.qty * item.unit_price, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-[#E5E9EB] pt-4 ml-auto w-64 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#7A9099]">Subtotal</span>
                <span className="font-medium text-[#1A2B32]">{formatAmount(subtotal, currency)}</span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A9099]">Tax ({taxRate}%)</span>
                  <span className="font-medium text-[#1A2B32]">{formatAmount(taxAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-[#E5E9EB]">
                <span className="text-[#1C4F4F]">Total</span>
                <span className="text-[#1C4F4F]">{formatAmount(total, currency)}</span>
              </div>
            </div>

            {notes && (
              <div className="mt-8 pt-6 border-t border-[#E5E9EB]">
                <p className="text-xs font-semibold text-[#7A9099] uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-[#3D5159] whitespace-pre-wrap">{notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}
