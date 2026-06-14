"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { useFinanceStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

const monthShort = (key: string) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", { month: "short" });
};

// shift a "YYYY-MM" key by n months
const shiftMonth = (key: string, n: number) => {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
};

export default function FinanceEvaluatePage() {
  const router = useRouter();
  const { transactions, categories } = useFinanceStore();

  const thisMonth = monthKey(new Date());

  // Months present in transactions (descending), guaranteeing the current month is selectable.
  const availableMonths = useMemo(() => {
    const set = new Set(transactions.map((t) => t.month));
    set.add(thisMonth);
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [transactions, thisMonth]);

  const [selectedMonth, setSelectedMonth] = useState(thisMonth);

  const getCat = (id: string) => categories.find((c) => c.id === id);

  // ─── Selected month aggregates ──────────────────────────────────
  const monthTxs = useMemo(
    () => transactions.filter((t) => t.month === selectedMonth),
    [transactions, selectedMonth]
  );

  const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  // Expense breakdown by category (current selected month)
  const expByCat = useMemo(() => {
    const map = new Map<string, number>();
    monthTxs.filter((t) => t.type === "expense").forEach((t) => {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([id, total]) => {
        const cat = getCat(id);
        return {
          id,
          name: cat?.name ?? "Lainnya",
          color: cat?.color ?? "#999",
          icon: cat?.icon ?? "💰",
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [monthTxs, categories]);

  // ─── Last 6 months income vs expense ────────────────────────────
  const last6 = useMemo(() => {
    const arr: { key: string; income: number; expense: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const key = shiftMonth(selectedMonth, -i);
      const txs = transactions.filter((t) => t.month === key);
      const inc = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      arr.push({ key, income: inc, expense: exp, net: inc - exp });
    }
    return arr;
  }, [transactions, selectedMonth]);

  const maxBar = Math.max(1, ...last6.flatMap((m) => [m.income, m.expense]));

  // ─── Net balance trend over ALL available months (asc) ──────────
  const netTrend = useMemo(() => {
    const months = Array.from(new Set(transactions.map((t) => t.month))).sort();
    return months.map((key) => {
      const txs = transactions.filter((t) => t.month === key);
      const inc = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return { key, net: inc - exp };
    });
  }, [transactions]);

  // Top 5 expenses by category as % of income
  const top5 = expByCat.slice(0, 5);

  // ─── Donut chart geometry ───────────────────────────────────────
  const donutTotal = expByCat.reduce((s, c) => s + c.total, 0);
  const R = 56;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const donutSegments = expByCat.map((c) => {
    const frac = donutTotal > 0 ? c.total / donutTotal : 0;
    const seg = { color: c.color, dash: frac * C, offset: -acc * C, frac };
    acc += frac;
    return seg;
  });

  // ─── Analysis & suggestions ─────────────────────────────────────
  const prevMonthKey = shiftMonth(selectedMonth, -1);
  const prevExpense = transactions
    .filter((t) => t.month === prevMonthKey && t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const momChange = prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : null;

  const biggestCat = expByCat[0];
  const biggestPctOfIncome = income > 0 && biggestCat ? Math.round((biggestCat.total / income) * 100) : 0;

  const softwareSpend = monthTxs
    .filter((t) => t.type === "expense" && /software|tools/i.test(getCat(t.categoryId)?.name ?? ""))
    .reduce((s, t) => s + t.amount, 0);
  const softwarePct = income > 0 ? Math.round((softwareSpend / income) * 100) : 0;

  type Insight = { ok: boolean; title: string; body: string };
  const insights: Insight[] = [];

  // savings rate vs 20% target
  if (savingsRate >= 20) {
    insights.push({
      ok: true,
      title: `Savings rate sehat (${savingsRate}%)`,
      body: `Kamu menyisihkan ${savingsRate}% dari pemasukan bulan ini, di atas target ideal 20%. Pertahankan kebiasaan ini.`,
    });
  } else {
    insights.push({
      ok: false,
      title: `Savings rate di bawah target (${savingsRate}%)`,
      body: `Target ideal seorang freelancer adalah menabung minimal 20% dari pemasukan. Coba pangkas pengeluaran tidak penting untuk menutup selisihnya.`,
    });
  }

  // expenses vs income
  if (expense > income) {
    insights.push({
      ok: false,
      title: "Pengeluaran melebihi pemasukan",
      body: `Bulan ini kamu defisit ${fmtIDR(expense - income)}. Sebagai pekerja lepas dengan pemasukan tidak tetap, kondisi ini berisiko menggerus tabungan.`,
    });
  } else {
    insights.push({
      ok: true,
      title: "Arus kas positif",
      body: `Pemasukan menutup seluruh pengeluaran dengan surplus ${fmtIDR(balance)}. Alokasikan surplus ke dana darurat atau investasi.`,
    });
  }

  // biggest expense category
  if (biggestCat) {
    insights.push({
      ok: biggestPctOfIncome <= 35,
      title: `Pengeluaran terbesar: ${biggestCat.name} (${biggestPctOfIncome}% dari pemasukan)`,
      body:
        biggestPctOfIncome > 35
          ? `Kategori ${biggestCat.name} menyerap ${biggestPctOfIncome}% pemasukanmu (${fmtIDR(biggestCat.total)}). Pertimbangkan untuk menekan pos ini.`
          : `Kategori ${biggestCat.name} (${fmtIDR(biggestCat.total)}) masih dalam batas wajar terhadap pemasukan.`,
    });
  }

  // software/tools spend
  if (softwareSpend > 0) {
    insights.push({
      ok: softwarePct <= 10,
      title: `Belanja Software & Tools (${softwarePct}% dari pemasukan)`,
      body:
        softwarePct > 10
          ? `Langganan tools mencapai ${fmtIDR(softwareSpend)}. Audit langganan yang jarang dipakai untuk menghemat biaya tetap bulanan.`
          : `Investasi tools sebesar ${fmtIDR(softwareSpend)} masih efisien dan mendukung produktivitas kerjamu.`,
    });
  }

  // month-over-month spending change
  if (momChange !== null) {
    insights.push({
      ok: momChange <= 0,
      title: `Pengeluaran ${momChange >= 0 ? "naik" : "turun"} ${Math.abs(momChange)}% vs bulan lalu`,
      body:
        momChange > 0
          ? `Pengeluaran naik dari ${fmtIDR(prevExpense)} menjadi ${fmtIDR(expense)}. Pantau agar kenaikan ini tidak berlanjut.`
          : `Bagus, pengeluaran turun dari ${fmtIDR(prevExpense)} menjadi ${fmtIDR(expense)} dibanding ${monthLabel(prevMonthKey)}.`,
    });
  }

  const kpis: { label: string; value: string; color: string; icon: IconName }[] = [
    { label: "Total Pemasukan", value: fmtIDR(income), color: "#5DB872", icon: "trending-up" },
    { label: "Total Pengeluaran", value: fmtIDR(expense), color: "#D85A4A", icon: "trending-down" },
    { label: "Saldo", value: fmtIDR(balance), color: balance >= 0 ? "#2A9D8F" : "#D85A4A", icon: "wallet" },
    { label: "Savings Rate", value: `${savingsRate}%`, color: savingsRate >= 20 ? "#5DB872" : "#E8A55A", icon: "sparkles" },
  ];

  const maxNet = Math.max(1, ...netTrend.map((m) => Math.abs(m.net)));

  return (
    <ShellLayout>
      <PageHeader
        title="Evaluasi Keuangan"
        subtitle={monthLabel(selectedMonth)}
        actions={
          <Button variant="outline" onClick={() => router.push("/finance")}>
            <Icon name="arrow-left" size={15} /> Kembali ke Finance
          </Button>
        }
      />

      {/* Month picker chips */}
      <div className="flex flex-wrap items-center gap-2 mb-7">
        <span className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: "var(--color-muted)" }}>
          <Icon name="calendar" size={13} /> Bulan:
        </span>
        {availableMonths.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border"
            style={
              selectedMonth === m
                ? { background: "#2A9D8F", borderColor: "#2A9D8F", color: "#fff" }
                : { background: "var(--color-surface)", borderColor: "var(--color-hairline)", color: "var(--color-muted)" }
            }
          >
            {monthLabel(m)}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
                  {k.label}
                </p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.color + "18" }}>
                  <Icon name={k.icon} size={14} style={{ color: k.color }} />
                </div>
              </div>
              <p className="text-[18px] font-bold leading-tight" style={{ color: k.color }}>
                {k.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start mb-6">
        {/* Donut: expense breakdown */}
        <Card>
          <CardHeader>
            <p className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
              <Icon name="chart-pie" size={14} style={{ color: "#2A9D8F" }} /> Komposisi Pengeluaran
            </p>
          </CardHeader>
          <CardContent>
            {expByCat.length === 0 ? (
              <p className="text-[12px] text-center py-10" style={{ color: "var(--color-muted-soft)" }}>
                Belum ada pengeluaran bulan ini.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <svg width="150" height="150" viewBox="0 0 150 150" className="flex-shrink-0">
                  <g transform="rotate(-90 75 75)">
                    <circle cx="75" cy="75" r={R} fill="none" stroke="var(--color-canvas)" strokeWidth="18" />
                    {donutSegments.map((s, i) => (
                      <circle
                        key={i}
                        cx="75"
                        cy="75"
                        r={R}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="18"
                        strokeDasharray={`${s.dash} ${C - s.dash}`}
                        strokeDashoffset={s.offset}
                      />
                    ))}
                  </g>
                  <text x="75" y="71" textAnchor="middle" className="text-[10px]" fill="var(--color-muted)">
                    Total
                  </text>
                  <text x="75" y="86" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-ink)">
                    {fmtIDR(donutTotal).replace("Rp", "Rp ")}
                  </text>
                </svg>
                <div className="flex-1 w-full flex flex-col gap-2">
                  {expByCat.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                      <span className="text-[12px] font-medium flex-1 truncate" style={{ color: "var(--color-ink)" }}>
                        {c.icon} {c.name}
                      </span>
                      <span className="text-[11px] font-semibold" style={{ color: "var(--color-muted)" }}>
                        {donutTotal > 0 ? Math.round((c.total / donutTotal) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar: income vs expense last 6 months */}
        <Card>
          <CardHeader>
            <p className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
              <Icon name="chart-bar" size={14} style={{ color: "#2A9D8F" }} /> Pemasukan vs Pengeluaran (6 Bulan)
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-[160px] pt-2">
              {last6.map((m) => (
                <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <div className="flex items-end justify-center gap-1 w-full h-full">
                    <div
                      className="w-1/2 max-w-[16px] rounded-t transition-all"
                      style={{ height: `${(m.income / maxBar) * 100}%`, background: "#5DB872", minHeight: m.income > 0 ? 3 : 0 }}
                      title={`Masuk: ${fmtIDR(m.income)}`}
                    />
                    <div
                      className="w-1/2 max-w-[16px] rounded-t transition-all"
                      style={{ height: `${(m.expense / maxBar) * 100}%`, background: "#D85A4A", minHeight: m.expense > 0 ? 3 : 0 }}
                      title={`Keluar: ${fmtIDR(m.expense)}`}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                    {monthShort(m.key)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 justify-center">
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-muted)" }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#5DB872" }} /> Pemasukan
              </span>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-muted)" }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#D85A4A" }} /> Pengeluaran
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start mb-6">
        {/* Net balance trend */}
        <Card>
          <CardHeader>
            <p className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
              <Icon name="chart-line" size={14} style={{ color: "#2A9D8F" }} /> Tren Saldo Bersih
            </p>
          </CardHeader>
          <CardContent>
            {netTrend.length === 0 ? (
              <p className="text-[12px] text-center py-10" style={{ color: "var(--color-muted-soft)" }}>
                Belum ada data.
              </p>
            ) : (
              <div className="flex items-center justify-between gap-2 h-[160px]">
                {netTrend.map((m) => {
                  const pos = m.net >= 0;
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center justify-center h-full">
                      <div className="flex-1 w-full flex flex-col justify-end items-center">
                        {pos && (
                          <div
                            className="w-1/2 max-w-[20px] rounded-t"
                            style={{ height: `${(m.net / maxNet) * 70}px`, background: "#2A9D8F", minHeight: 3 }}
                            title={fmtIDR(m.net)}
                          />
                        )}
                      </div>
                      <div className="w-full" style={{ borderTop: "1px solid var(--color-hairline)" }} />
                      <div className="flex-1 w-full flex flex-col justify-start items-center">
                        {!pos && (
                          <div
                            className="w-1/2 max-w-[20px] rounded-b"
                            style={{ height: `${(Math.abs(m.net) / maxNet) * 70}px`, background: "#D85A4A", minHeight: 3 }}
                            title={fmtIDR(m.net)}
                          />
                        )}
                      </div>
                      <span className="text-[10px] mt-1" style={{ color: "var(--color-muted)" }}>
                        {monthShort(m.key)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 expenses */}
        <Card>
          <CardHeader>
            <p className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
              <Icon name="list-check" size={14} style={{ color: "#2A9D8F" }} /> Top 5 Pengeluaran
            </p>
          </CardHeader>
          <CardContent>
            {top5.length === 0 ? (
              <p className="text-[12px] text-center py-10" style={{ color: "var(--color-muted-soft)" }}>
                Belum ada pengeluaran.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {top5.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ background: c.color + "22", color: c.color }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>
                          {c.icon} {c.name}
                        </span>
                        <span className="text-[12px] font-semibold" style={{ color: "var(--color-muted)" }}>
                          {fmtIDR(c.total)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-canvas)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${income > 0 ? Math.min(100, (c.total / income) * 100) : 0}%`, background: c.color }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold w-10 text-right flex-shrink-0" style={{ color: "var(--color-muted)" }}>
                      {income > 0 ? Math.round((c.total / income) * 100) : 0}%
                    </span>
                  </div>
                ))}
                <p className="text-[10px] mt-1" style={{ color: "var(--color-muted-soft)" }}>
                  Persentase dihitung terhadap total pemasukan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis & suggestions */}
      <Card className="mb-4">
        <CardHeader>
          <p className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
            <Icon name="sparkles" size={14} style={{ color: "#2A9D8F" }} /> Analisis &amp; Saran
          </p>
        </CardHeader>
        <CardContent>
          {income === 0 && expense === 0 ? (
            <p className="text-[12px] text-center py-6" style={{ color: "var(--color-muted-soft)" }}>
              Belum ada transaksi pada {monthLabel(selectedMonth)} untuk dianalisis.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((ins, i) => {
                const color = ins.ok ? "#2A9D8F" : "#E8A55A";
                return (
                  <div
                    key={i}
                    className="flex gap-3 p-3 rounded-xl"
                    style={{ background: color + "10", border: `1px solid ${color}33` }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: color + "22" }}
                    >
                      <Icon name={ins.ok ? "check-circle" : "alert-triangle"} size={14} style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[12px] font-bold" style={{ color: "var(--color-ink)" }}>
                          {ins.title}
                        </p>
                        <Badge variant={ins.ok ? "teal" : "medium"} className="text-[9px]">
                          {ins.ok ? "baik" : "perhatian"}
                        </Badge>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                        {ins.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </ShellLayout>
  );
}
