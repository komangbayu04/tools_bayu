"use client";

import type { SavedDoc } from "@/lib/store";
import { InvoicePreview, QuotationPreview } from "@/app/invoice/_preview";
import type { LineItem, QuoteItem } from "@/app/invoice/_preview";

type Snap = Record<string, unknown>;

const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: unknown) => (typeof v === "number" ? v : 0);

// Build the same payment rows the share/print page uses.
function paymentRowsOf(snap: Snap): [string, string][] {
  return [
    ["Bank Name", s(snap.bankName)],
    ["Bank Address", s(snap.bankAddress)],
    ["Bank Country of Origin", s(snap.bankCountry)],
    ["Account Holder Name", s(snap.accHolder)],
    ["Account Holder Address", s(snap.accAddress)],
    ["Bank Account No", s(snap.accNo)],
    ["Bank Swift Code", s(snap.swift)],
    ["Bank Code", s(snap.bankCode)],
    ["Branch Code", s(snap.branchCode)],
  ];
}

// ─── Public component ─────────────────────────────────────────────
// Renders the document using the *exact* same templates as the public
// share page (app/invoice/_preview.tsx), so the history preview is
// identical to the real document — just scaled down to fit the card.
export function DocDetail({ doc }: { doc: SavedDoc }) {
  const snap = (doc.snapshot ?? {}) as Snap;

  if (!doc.snapshot || typeof doc.snapshot !== "object") {
    return (
      <p className="text-[12.5px] italic" style={{ color: "var(--color-muted)" }}>
        Detail dokumen tidak tersedia.
      </p>
    );
  }

  // Prefer the snapshot's own docType; fall back to the saved doc type.
  const docType = (snap.docType as string) || doc.type;
  const paymentRows = paymentRowsOf(snap);

  let body: React.ReactNode;
  if (docType === "quotation") {
    const quoteItems = (Array.isArray(snap.quoteItems) ? snap.quoteItems : []) as QuoteItem[];
    body = (
      <QuotationPreview
        fromName={s(snap.fromName)}
        clientName={s(snap.clientName)}
        companyName={s(snap.companyName)}
        projectName={s(snap.projectName)}
        docNo={s(snap.docNo)}
        dateIssued={s(snap.dateIssued)}
        quoteItems={quoteItems}
        total={quoteItems.reduce((sum, i) => sum + n(i.price) * n(i.qty), 0)}
        paymentRows={paymentRows}
        contactName={s(snap.contactName)}
        contactEmail={s(snap.contactEmail)}
        contactPhone={s(snap.contactPhone)}
      />
    );
  } else {
    const items = (Array.isArray(snap.items) ? snap.items : []) as LineItem[];
    const rate = n(snap.rate);
    body = (
      <InvoicePreview
        fromName={s(snap.fromName)}
        fromAddress={s(snap.fromAddress)}
        clientName={s(snap.clientName)}
        dateIssued={s(snap.dateIssued)}
        paymentStatus={s(snap.paymentStatus)}
        totalTasks={n(snap.totalTasks)}
        items={items}
        rate={rate}
        total={items.reduce((sum, i) => sum + n(i.hours) * rate, 0)}
        paymentRows={paymentRows}
        contactName={s(snap.contactName)}
        contactEmail={s(snap.contactEmail)}
        contactPhone={s(snap.contactPhone)}
      />
    );
  }

  // Render the real "paper" look, matching the share page (white sheet,
  // dark ink, generous padding). The whole sheet sits in a scroll area so
  // wide tables stay readable inside the history card.
  return (
    <div className="overflow-x-auto -mx-1">
      <div
        className="mx-auto"
        style={{
          maxWidth: 860,
          background: "#fff",
          color: "#1a1a1a",
          padding: "40px 44px",
          borderRadius: 8,
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
          minWidth: 680,
        }}
      >
        {body}
      </div>
    </div>
  );
}
