"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { useInvoiceHistoryStore, type SavedDoc, type DocType } from "@/lib/store";
import { differenceInCalendarDays } from "date-fns";

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

// Display metadata per document type.
const TYPE_META: Record<DocType, { label: string; variant: "teal" | "purple" | "medium" | "low" }> = {
  invoice: { label: "Invoice", variant: "teal" },
  quotation: { label: "Quotation", variant: "purple" },
  contract: { label: "Kontrak", variant: "medium" },
  proposal: { label: "Proposal", variant: "low" },
};

// Returns a reminder badge for an unpaid invoice based on its due date.
function dueInfo(doc: SavedDoc): { label: string; color: string; bg: string } | null {
  if (doc.type !== "invoice" || doc.status === "paid" || !doc.dueDate) return null;
  const days = differenceInCalendarDays(new Date(doc.dueDate + "T00:00:00"), new Date());
  if (days < 0) return { label: `Telat ${Math.abs(days)} hari`, color: "#C64545", bg: "rgba(198,69,69,0.12)" };
  if (days === 0) return { label: "Jatuh tempo hari ini", color: "#C64545", bg: "rgba(198,69,69,0.12)" };
  if (days <= 3) return { label: `Jatuh tempo ${days} hari lagi`, color: "#D99A3C", bg: "rgba(217,154,60,0.14)" };
  return { label: `Jatuh tempo ${days} hari lagi`, color: "var(--color-muted)", bg: "var(--color-canvas)" };
}

// Group/filter key derived from the document's issued date (fallback: saved date).
const monthKey = (doc: SavedDoc) => {
  const d = doc.dateIssued ? new Date(doc.dateIssued) : new Date(doc.savedAt);
  return isNaN(d.getTime()) ? format(new Date(doc.savedAt), "yyyy-MM") : format(d, "yyyy-MM");
};

const monthLabel = (key: string) => format(new Date(key + "-01"), "MMMM yyyy");

export default function DocumentHistoryPage() {
  const { history, deleteDoc, setDocStatus } = useInvoiceHistoryStore();
  const router = useRouter();
  const [month, setMonth] = useState<string>("all");
  const [docType, setDocType] = useState<"all" | DocType>("all");

  // Unpaid invoices that are due soon or overdue — surfaced as reminders.
  const reminders = useMemo(
    () =>
      history
        .filter((d) => d.type === "invoice" && d.status !== "paid" && d.dueDate)
        .map((d) => ({ doc: d, days: differenceInCalendarDays(new Date(d.dueDate! + "T00:00:00"), new Date()) }))
        .filter((r) => r.days <= 7)
        .sort((a, b) => a.days - b.days),
    [history]
  );

  const months = useMemo(() => {
    const set = new Set(history.map(monthKey));
    return Array.from(set).sort().reverse();
  }, [history]);

  const filtered = useMemo(
    () =>
      history.filter(
        (d) => (month === "all" || monthKey(d) === month) && (docType === "all" || d.type === docType)
      ),
    [history, month, docType]
  );

  // Available document types present in history, for the type filter.
  const typeCounts = useMemo(() => {
    const counts = {} as Record<DocType, number>;
    history.forEach((d) => { counts[d.type] = (counts[d.type] ?? 0) + 1; });
    return counts;
  }, [history]);

  const chip = (active: boolean) =>
    active
      ? { background: "var(--color-primary-light)", borderColor: "var(--color-primary)", color: "var(--color-primary-ink)" }
      : { background: "var(--color-surface)", borderColor: "var(--color-hairline)", color: "var(--color-muted)" };

  return (
    <ShellLayout>
      <PageHeader
        title="Riwayat Dokumen"
        subtitle={`${history.length} dokumen tersimpan — invoice, kontrak, proposal & quotation`}
        actions={
          <Button onClick={() => router.push("/invoice")}>
            <Icon name="plus" size={15} /> Buat Invoice
          </Button>
        }
      />

      {/* Reminders: invoices due soon / overdue */}
      {reminders.length > 0 && (
        <div className="mb-6 rounded-[14px] border p-4" style={{ background: "rgba(217,154,60,0.06)", borderColor: "rgba(217,154,60,0.3)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Icon name="alert-triangle" size={15} style={{ color: "#D99A3C" }} />
            <p className="text-[13px] font-bold" style={{ color: "var(--color-ink)" }}>
              Pengingat Pembayaran ({reminders.length})
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {reminders.map(({ doc, days }) => {
              const overdue = days < 0;
              const today = days === 0;
              const urgent = overdue || today || days <= 3;
              return (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "var(--color-surface)" }}>
                  <span className="text-[13px] font-semibold flex-1 truncate" style={{ color: "var(--color-ink)" }}>
                    {doc.clientName || "—"}
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>{fmtIDR(doc.total)}</span>
                  <span
                    className="text-[11px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap"
                    style={{
                      color: urgent ? "#C64545" : "var(--color-muted)",
                      background: urgent ? "rgba(198,69,69,0.12)" : "var(--color-canvas)",
                    }}
                  >
                    {overdue ? `Telat ${Math.abs(days)} hari` : today ? "Jatuh tempo hari ini" : `${days} hari lagi`}
                  </span>
                  <button
                    onClick={() => setDocStatus(doc.id, "paid")}
                    className="text-[11px] font-semibold rounded-full px-3 py-1 whitespace-nowrap transition-opacity hover:opacity-80"
                    style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
                  >
                    Tandai Lunas
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Type filter */}
      {history.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => setDocType("all")}
            className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all"
            style={chip(docType === "all")}
          >
            Semua Tipe
          </button>
          {(Object.keys(TYPE_META) as DocType[])
            .filter((t) => typeCounts[t])
            .map((t) => (
              <button
                key={t}
                onClick={() => setDocType(t)}
                className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all"
                style={chip(docType === t)}
              >
                {TYPE_META[t].label} ({typeCounts[t]})
              </button>
            ))}
        </div>
      )}

      {/* Month filter */}
      {history.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setMonth("all")}
            className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all"
            style={chip(month === "all")}
          >
            All
          </button>
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all"
              style={chip(month === m)}
            >
              {monthLabel(m)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center text-center py-20">
          <Icon name="file-text" size={34} style={{ color: "var(--color-muted-soft)" }} />
          <p className="text-[14px] font-semibold mt-4" style={{ color: "var(--color-ink)" }}>
            Belum ada dokumen tersimpan{month === "all" && docType === "all" ? "" : " untuk filter ini"}.
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--color-muted-soft)" }}>
            Invoice, kontrak, proposal & quotation yang kamu simpan akan muncul di sini.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((doc) => (
            <Card key={doc.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <Badge variant={TYPE_META[doc.type].variant}>{TYPE_META[doc.type].label}</Badge>
                  <p className="text-[14px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>
                    {doc.clientName || "—"}
                  </p>
                  {doc.title && (
                    <span className="text-[12.5px] truncate" style={{ color: "var(--color-muted)" }}>
                      · {doc.title}
                    </span>
                  )}
                  {doc.type === "invoice" && (
                    doc.status === "paid" ? (
                      <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: "var(--color-success)", background: "rgba(78,157,84,0.14)" }}>
                        Lunas
                      </span>
                    ) : (() => {
                      const info = dueInfo(doc);
                      return info ? (
                        <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: info.color, background: info.bg }}>
                          {info.label}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: "var(--color-muted)", background: "var(--color-canvas)" }}>
                          Belum dibayar
                        </span>
                      );
                    })()
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: "var(--color-muted)" }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="calendar" size={12} />
                    {doc.dateIssued ? format(new Date(doc.dateIssued), "d MMM yyyy") : "—"}
                  </span>
                  {doc.dueDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="clock" size={12} />
                      Tempo {format(new Date(doc.dueDate), "d MMM yyyy")}
                    </span>
                  )}
                </div>
              </div>
              {doc.total > 0 && (
                <p className="text-[15px] font-semibold flex-shrink-0" style={{ color: "var(--color-primary)" }}>
                  {fmtIDR(doc.total)}
                </p>
              )}
              {doc.type === "invoice" && (
                <button
                  onClick={() => setDocStatus(doc.id, doc.status === "paid" ? "unpaid" : "paid")}
                  className="text-[11px] font-semibold rounded-full px-3 py-1.5 whitespace-nowrap transition-opacity hover:opacity-80 flex-shrink-0"
                  style={
                    doc.status === "paid"
                      ? { background: "var(--color-canvas)", color: "var(--color-muted)", border: "1px solid var(--color-hairline)" }
                      : { background: "var(--color-primary)", color: "var(--color-on-primary)" }
                  }
                >
                  {doc.status === "paid" ? "Set Belum Bayar" : "Tandai Lunas"}
                </button>
              )}
              <button
                onClick={() => deleteDoc(doc.id)}
                className="p-2 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                style={{ color: "#C64545" }}
                aria-label="Delete document"
              >
                <Icon name="trash" size={15} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </ShellLayout>
  );
}
