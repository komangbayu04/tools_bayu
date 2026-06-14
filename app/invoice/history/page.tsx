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
import { useInvoiceHistoryStore, type SavedDoc } from "@/lib/store";

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

// Group/filter key derived from the document's issued date (fallback: saved date).
const monthKey = (doc: SavedDoc) => {
  const d = doc.dateIssued ? new Date(doc.dateIssued) : new Date(doc.savedAt);
  return isNaN(d.getTime()) ? format(new Date(doc.savedAt), "yyyy-MM") : format(d, "yyyy-MM");
};

const monthLabel = (key: string) => format(new Date(key + "-01"), "MMMM yyyy");

export default function InvoiceHistoryPage() {
  const { history, deleteDoc } = useInvoiceHistoryStore();
  const router = useRouter();
  const [month, setMonth] = useState<string>("all");

  const months = useMemo(() => {
    const set = new Set(history.map(monthKey));
    return Array.from(set).sort().reverse();
  }, [history]);

  const filtered = useMemo(
    () => (month === "all" ? history : history.filter((d) => monthKey(d) === month)),
    [history, month]
  );

  const chip = (active: boolean) =>
    active
      ? { background: "var(--color-primary-light)", borderColor: "var(--color-primary)", color: "var(--color-primary-ink)" }
      : { background: "var(--color-surface)", borderColor: "var(--color-hairline)", color: "var(--color-muted)" };

  return (
    <ShellLayout>
      <PageHeader
        title="Invoice History"
        subtitle={`${history.length} saved document${history.length === 1 ? "" : "s"}`}
        actions={
          <Button onClick={() => router.push("/invoice")}>
            <Icon name="plus" size={15} /> Buat Invoice
          </Button>
        }
      />

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
            No saved documents{month === "all" ? "" : " this month"}.
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--color-muted-soft)" }}>
            Saved invoices and quotations will appear here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((doc) => (
            <Card key={doc.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Badge variant={doc.type === "invoice" ? "teal" : "purple"}>{doc.type}</Badge>
                  <p className="text-[14px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>
                    {doc.clientName || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: "var(--color-muted)" }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="calendar" size={12} />
                    {doc.dateIssued ? format(new Date(doc.dateIssued), "d MMM yyyy") : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="clock" size={12} />
                    Saved {format(new Date(doc.savedAt), "d MMM yyyy, HH:mm")}
                  </span>
                </div>
              </div>
              <p className="text-[15px] font-semibold flex-shrink-0" style={{ color: "var(--color-primary)" }}>
                {fmtIDR(doc.total)}
              </p>
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
