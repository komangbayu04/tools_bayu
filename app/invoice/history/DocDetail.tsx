"use client";

import { format } from "date-fns";
import type { SavedDoc } from "@/lib/store";

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (v: unknown) => {
  if (!v || typeof v !== "string") return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : format(d, "d MMM yyyy");
};

const isNum = (v: unknown): v is number => typeof v === "number" && !isNaN(v);
const str = (v: unknown) => (v == null || v === "" ? "—" : String(v));

// ─── Small layout primitives ──────────────────────────────────────
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>{label}</span>
      <span className="text-[13px]" style={{ color: "var(--color-ink)" }}>{value}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>{title}</p>
      {children}
    </div>
  );
}

function Para({ label, value }: { label: string; value: unknown }) {
  if (!value || typeof value !== "string") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>{label}</span>
      <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-ink)" }}>{value}</p>
    </div>
  );
}

// Generic line-item table for invoice/quotation items.
function ItemTable({ items }: { items: Array<Record<string, unknown>> }) {
  if (!items?.length) return null;
  // Pick a sensible label + amount field from common shapes.
  const labelKey = ["description", "name", "label", "item", "task"].find((k) => k in items[0]) ?? Object.keys(items[0])[0];
  const amountKey = ["amount", "price", "total", "subtotal", "cost"].find((k) => k in items[0]);
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-hairline)" }}>
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]"
          style={{ borderTop: i ? "1px solid var(--color-hairline)" : undefined, color: "var(--color-ink)" }}
        >
          <span className="truncate">{str(it[labelKey])}</span>
          {amountKey && isNum(it[amountKey]) && (
            <span className="flex-shrink-0 font-medium" style={{ color: "var(--color-primary)" }}>{fmtIDR(it[amountKey] as number)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// String-array clause/scope list.
function ListBlock({ title, items }: { title: string; items: unknown }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const lines = items.filter((x) => typeof x === "string" && x.trim());
  if (!lines.length) return null;
  return (
    <Block title={title}>
      <ul className="flex flex-col gap-1.5">
        {lines.map((x, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug" style={{ color: "var(--color-ink)" }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]" style={{ background: "var(--color-primary)" }} />
            {x as string}
          </li>
        ))}
      </ul>
    </Block>
  );
}

type Snap = Record<string, unknown>;

// ─── Per-type renderers ───────────────────────────────────────────
function InvoiceDetail({ s }: { s: Snap }) {
  const items = (Array.isArray(s.items) && s.items.length ? s.items : s.quoteItems) as Array<Record<string, unknown>> | undefined;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Dari" value={str(s.fromName)} />
        <Field label="Untuk" value={str(s.clientName || s.companyName)} />
        {!!s.projectName && <Field label="Proyek" value={str(s.projectName)} />}
        {!!s.docNo && <Field label="No. Dokumen" value={str(s.docNo)} />}
        <Field label="Tanggal" value={fmtDate(s.dateIssued)} />
        {!!s.dueDate && <Field label="Jatuh Tempo" value={fmtDate(s.dueDate)} />}
      </div>
      {items && items.length > 0 && (
        <Block title="Item"><ItemTable items={items} /></Block>
      )}
      {Boolean(s.bankName || s.accNo) && (
        <Block title="Pembayaran">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {!!s.bankName && <Field label="Bank" value={str(s.bankName)} />}
            {!!s.accHolder && <Field label="Atas Nama" value={str(s.accHolder)} />}
            {!!s.accNo && <Field label="No. Rekening" value={str(s.accNo)} />}
            {!!s.swift && <Field label="SWIFT" value={str(s.swift)} />}
          </div>
        </Block>
      )}
    </div>
  );
}

function ContractDetail({ s }: { s: Snap }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Freelancer" value={str(s.freelancerName)} />
        <Field label="Klien" value={str(s.clientName || s.clientCompany)} />
        {!!s.projectName && <Field label="Proyek" value={str(s.projectName)} />}
        {!!s.docNo && <Field label="No. Kontrak" value={str(s.docNo)} />}
        <Field label="Mulai" value={fmtDate(s.startDate)} />
        {!!s.endDate && <Field label="Selesai" value={fmtDate(s.endDate)} />}
        {isNum(s.totalAmount) && <Field label="Nilai" value={fmtIDR(s.totalAmount as number)} />}
      </div>
      <Para label="Deskripsi Proyek" value={s.projectDescription} />
      <Para label="Termin Pembayaran" value={s.paymentTerms} />
      <Para label="Hak Kekayaan Intelektual" value={s.ipClause} />
      <Para label="Revisi" value={s.revisionClause} />
      <Para label="Kerahasiaan" value={s.confidentialClause} />
      <Para label="Terminasi" value={s.terminationClause} />
      <ListBlock title="Klausul Tambahan" items={s.additionalClauses} />
    </div>
  );
}

function ProposalDetail({ s }: { s: Snap }) {
  const pricing = s.pricing as Array<Record<string, unknown>> | undefined;
  const phases = s.phases as Array<Record<string, unknown>> | undefined;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Dari" value={str(s.fromName)} />
        <Field label="Klien" value={str(s.clientName || s.clientCompany)} />
        {!!s.projectName && <Field label="Proyek" value={str(s.projectName)} />}
        {!!s.docNo && <Field label="No. Proposal" value={str(s.docNo)} />}
        <Field label="Tanggal" value={fmtDate(s.dateIssued)} />
        {!!s.validUntil && <Field label="Berlaku Hingga" value={fmtDate(s.validUntil)} />}
      </div>
      <Para label="Overview" value={s.overview} />
      {Array.isArray(s.scopeItems) && (
        <ListBlock title="Scope" items={(s.scopeItems as Array<Record<string, unknown>>).map((x) => str(x.title ?? x.name ?? x.description))} />
      )}
      {phases && phases.length > 0 && (
        <Block title="Timeline">
          <div className="flex flex-col gap-1.5">
            {phases.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-[12.5px]" style={{ color: "var(--color-ink)" }}>
                <span>{str(p.title ?? p.name)}</span>
                <span style={{ color: "var(--color-muted)" }}>{str(p.duration ?? p.timeline ?? p.date)}</span>
              </div>
            ))}
          </div>
        </Block>
      )}
      {pricing && pricing.length > 0 && (
        <Block title="Pricing"><ItemTable items={pricing} /></Block>
      )}
      <Para label="Terms" value={s.terms} />
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────
export function DocDetail({ doc }: { doc: SavedDoc }) {
  const s = (doc.snapshot ?? {}) as Snap;
  if (!doc.snapshot || typeof doc.snapshot !== "object") {
    return <p className="text-[12.5px] italic" style={{ color: "var(--color-muted)" }}>Detail dokumen tidak tersedia.</p>;
  }
  return (
    <>
      {doc.type === "contract" ? (
        <ContractDetail s={s} />
      ) : doc.type === "proposal" ? (
        <ProposalDetail s={s} />
      ) : (
        <InvoiceDetail s={s} />
      )}
    </>
  );
}
