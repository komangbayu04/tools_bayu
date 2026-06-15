"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print-hide mx-auto mb-6 block rounded-lg px-7 py-2.5 text-[14px] font-semibold text-white"
      style={{ background: "#4e7d2e" }}
    >
      🖨 Print / Simpan PDF
    </button>
  );
}
