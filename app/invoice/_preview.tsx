import { format } from "date-fns";

export interface LineItem {
  id: string;
  date: string;
  title: string;
  tasks: string;
  project: string;
  hours: number;
}

export interface QuoteItem {
  id: string;
  service: string;
  description: string;
  packageItems: string;
  includes: string;
  price: number;
  qty: number;
}

export const fmtIDR = (n: number) => "IDR " + new Intl.NumberFormat("en-US").format(n);
const bullets = (text: string) => text.split("\n").map(t => t.trim()).filter(Boolean);

export function InvoicePreview({ fromName, fromAddress, clientName, dateIssued, paymentStatus, totalTasks, items, rate, total, paymentRows, contactName, contactEmail, contactPhone }: {
  fromName: string; fromAddress: string; clientName: string; dateIssued: string; paymentStatus: string;
  totalTasks: number; items: LineItem[]; rate: number; total: number;
  paymentRows: [string, string][]; contactName: string; contactEmail: string; contactPhone: string;
}) {
  const subtotalOf = (item: LineItem) => item.hours * rate;
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

export function QuotationPreview({ fromName, clientName, companyName, projectName, docNo, dateIssued, quoteItems, total, paymentRows, contactName, contactEmail, contactPhone }: {
  fromName: string; clientName: string; companyName: string; projectName: string;
  docNo: string; dateIssued: string; quoteItems: QuoteItem[]; total: number;
  paymentRows: [string, string][]; contactName: string; contactEmail: string; contactPhone: string;
}) {
  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div />
        <p className="text-[40px] font-bold tracking-widest uppercase" style={{ color: "#444", letterSpacing: "0.12em" }}>QUOTATION</p>
      </div>
      <div className="border-t border-[#E0E0E0] mb-6" />
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
      <div className="grid grid-cols-[36px_100px_1fr_130px_50px_110px] gap-2 py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ background: "#F5F5F5", borderRadius: 4 }}>
        <span>NO.</span><span>SERVICE</span><span>DESCRIPTION</span><span>PRICE</span><span>QTY</span><span className="text-right">TOTAL</span>
      </div>
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
      <div className="border-t-2 border-[#E0E0E0] mt-2" />
      <div className="grid grid-cols-[36px_100px_1fr_130px_50px_110px] gap-2 py-3.5 px-3 font-bold text-[14px]" style={{ background: "#F5F5F5" }}>
        <span /><span /><span /><span>TOTAL</span><span>IDR</span><span className="text-right">{new Intl.NumberFormat("en-US").format(total)}</span>
      </div>
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
