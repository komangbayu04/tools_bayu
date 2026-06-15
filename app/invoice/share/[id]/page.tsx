import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InvoicePreview, QuotationPreview } from "@/app/invoice/_preview";
import type { LineItem, QuoteItem } from "@/app/invoice/_preview";
import { PrintButton } from "./PrintButton";

// This page is public (no auth). We use the anon key — RLS allows select on shared_invoices.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://frqwamdqfnuvihmregja.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_N07WAghUlpHLaK2ydAqooA_6v7Xvbxb",
  { auth: { persistSession: false } }
);

async function getSnapshot(id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("shared_invoices")
    .select("snapshot")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data.snapshot as Record<string, unknown>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await getSnapshot(id);
  if (!s) return { title: "Document not found" };
  const title =
    s.docType === "invoice"
      ? `Invoice — ${s.clientName}`
      : `Quotation ${s.docNo} — ${s.companyName}`;
  return { title };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSnapshot(id);
  if (!s) notFound();

  const docType = s.docType as "invoice" | "quotation";
  const paymentRows: [string, string][] = [
    ["Bank Name", s.bankName as string],
    ["Bank Address", s.bankAddress as string],
    ["Bank Country of Origin", s.bankCountry as string],
    ["Account Holder Name", s.accHolder as string],
    ["Account Holder Address", s.accAddress as string],
    ["Bank Account No", s.accNo as string],
    ["Bank Swift Code", s.swift as string],
    ["Bank Code", s.bankCode as string],
    ["Branch Code", s.branchCode as string],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f4", padding: "32px 16px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <PrintButton />
        <div className="printable" style={{ background: "#fff", color: "#1a1a1a", padding: "48px 56px", borderRadius: 8, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
          {docType === "invoice" ? (
            <InvoicePreview
              fromName={s.fromName as string}
              fromAddress={s.fromAddress as string}
              clientName={s.clientName as string}
              dateIssued={s.dateIssued as string}
              paymentStatus={s.paymentStatus as string}
              totalTasks={s.totalTasks as number}
              items={s.items as LineItem[]}
              rate={s.rate as number}
              total={(s.items as LineItem[]).reduce((sum, i) => sum + i.hours * (s.rate as number), 0)}
              paymentRows={paymentRows}
              contactName={s.contactName as string}
              contactEmail={s.contactEmail as string}
              contactPhone={s.contactPhone as string}
            />
          ) : (
            <QuotationPreview
              fromName={s.fromName as string}
              clientName={s.clientName as string}
              companyName={s.companyName as string}
              projectName={s.projectName as string}
              docNo={s.docNo as string}
              dateIssued={s.dateIssued as string}
              quoteItems={s.quoteItems as QuoteItem[]}
              total={(s.quoteItems as QuoteItem[]).reduce((sum, i) => sum + i.price * i.qty, 0)}
              paymentRows={paymentRows}
              contactName={s.contactName as string}
              contactEmail={s.contactEmail as string}
              contactPhone={s.contactPhone as string}
            />
          )}
        </div>
      </div>
    </div>
  );
}
