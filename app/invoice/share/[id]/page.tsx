import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { InvoicePreview, QuotationPreview } from "@/app/invoice/_preview";
import type { LineItem, QuoteItem } from "@/app/invoice/_preview";

// This page is public (no auth). We use the anon key — RLS allows select on shared_invoices.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://frqwamdqfnuvihmregja.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_N07WAghUlpHLaK2ydAqooA_6v7Xvbxb",
  { auth: { persistSession: false } }
);

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("shared_invoices")
    .select("snapshot")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const s = data.snapshot as Record<string, unknown>;

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
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>
          {docType === "invoice"
            ? `Invoice — ${s.clientName}`
            : `Quotation ${s.docNo} — ${s.companyName}`}
        </title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #f4f4f4; }
          .page { max-width: 860px; margin: 32px auto; background: #fff; padding: 48px 56px; border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
          .print-btn { display: block; margin: 0 auto 24px; padding: 10px 28px; background: #4e7d2e; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
          @media print { .print-btn { display: none; } body { background: #fff; } .page { box-shadow: none; margin: 0; border-radius: 0; } }
        `}</style>
      </head>
      <body>
        <button className="print-btn" onClick={() => window.print()}>🖨 Print / Save PDF</button>
        <div className="page">
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
      </body>
    </html>
  );
}
