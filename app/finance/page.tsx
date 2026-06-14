"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { useFinanceStore, type TransactionType } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

const ICON_OPTIONS: IconName[] = ["building", "flag", "settings", "receipt", "circle-dot", "sparkles", "play", "wallet", "money", "chart-pie", "chart-bar", "folder", "user", "email", "phone", "calendar", "list-check"];
const COLOR_OPTIONS = ["#2A9D8F","#6D8DF0","#E8A55A","#C77DD6","#5DB872","#F0A07C","#4DBFC4","#D85A4A","#8C7DE8","#3A4FC4"];

export default function FinancePage() {
  const router = useRouter();
  const { transactions, categories, addTransaction, deleteTransaction, addCategory, deleteCategory } = useFinanceStore();

  // Month navigation
  const [currentMonth, setCurrentMonth] = useState(() => monthKey(new Date()));

  // Modal state
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [txTab, setTxTab] = useState<"all" | TransactionType>("all");

  // Add Transaction form
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txCatId, setTxCatId] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [txNote, setTxNote] = useState("");

  // Add Category form
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<TransactionType>("expense");
  const [catColor, setCatColor] = useState(COLOR_OPTIONS[0]);
  const [catIcon, setCatIcon] = useState<IconName>("building");

  // Filtered transactions for current month
  const monthTxs = useMemo(() =>
    transactions.filter(t => t.month === currentMonth),
    [transactions, currentMonth]
  );

  const displayTxs = useMemo(() =>
    txTab === "all" ? monthTxs : monthTxs.filter(t => t.type === txTab),
    [monthTxs, txTab]
  );

  const income = monthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  // Category breakdown for expenses
  const catBreakdown = useMemo(() => {
    const expCats = categories.filter(c => c.type === "expense");
    return expCats.map(cat => {
      const total = monthTxs.filter(t => t.categoryId === cat.id && t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return { ...cat, total };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [monthTxs, categories]);

  const maxCatTotal = catBreakdown[0]?.total || 1;

  // Navigate months
  const prevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(monthKey(d));
  };
  const nextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setCurrentMonth(monthKey(d));
  };
  const isCurrentMonth = currentMonth === monthKey(new Date());

  const handleAddTx = () => {
    if (!txAmount || !txCatId || !txDesc) return;
    addTransaction({
      amount: Number(txAmount),
      type: txType,
      categoryId: txCatId,
      description: txDesc,
      date: txDate,
      month: txDate.slice(0, 7),
      note: txNote,
    });
    setTxAmount(""); setTxCatId(""); setTxDesc(""); setTxNote(""); setTxDate(new Date().toISOString().slice(0, 10));
    setShowAddTx(false);
  };

  const handleAddCat = () => {
    if (!catName.trim()) return;
    addCategory({ name: catName.trim(), type: catType, color: catColor, icon: catIcon });
    setCatName(""); setCatType("expense"); setCatColor(COLOR_OPTIONS[0]); setCatIcon("building");
    setShowAddCat(false);
  };

  const getCat = (id: string) => categories.find(c => c.id === id);

  return (
    <ShellLayout>
      <PageHeader
        title="Finance"
        subtitle="Pencatatan keuangan bulanan"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowAddCat(true)}><Icon name="plus" size={15} /> Kategori</Button>
            <Button variant="outline" onClick={() => router.push("/finance/evaluate")}><Icon name="sparkles" size={15} /> Evaluasi</Button>
            <Button onClick={() => setShowAddTx(true)}><Icon name="plus" size={15} /> Tambah</Button>
          </>
        }
      />

      {/* Month navigator */}
      <div className="flex items-center gap-3 mb-7">
        <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--color-canvas)]" style={{ border: "1px solid var(--color-hairline)" }}>
          <Icon name="chevron-left" size={16} style={{ color: "var(--color-muted)" }} />
        </button>
        <p className="text-[15px] font-bold min-w-[160px] text-center" style={{ color: "var(--color-ink)" }}>{monthLabel(currentMonth)}</p>
        <button onClick={nextMonth} disabled={isCurrentMonth} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--color-canvas)] disabled:opacity-30" style={{ border: "1px solid var(--color-hairline)" }}>
          <Icon name="chevron-right" size={16} style={{ color: "var(--color-muted)" }} />
        </button>
        {!isCurrentMonth && (
          <button onClick={() => setCurrentMonth(monthKey(new Date()))} className="text-[12px] font-semibold hover:opacity-70" style={{ color: "#2A9D8F" }}>Kembali ke bulan ini</button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        {([
          { label: "Pemasukan", value: income, color: "#5DB872", icon: "trending-up" as IconName },
          { label: "Pengeluaran", value: expense, color: "#D85A4A", icon: "trending-down" as IconName },
          { label: "Saldo", value: balance, color: balance >= 0 ? "#2A9D8F" : "#D85A4A", icon: (balance >= 0 ? "trending-up" : "trending-down") as IconName },
          { label: "Savings Rate", value: savingsRate, color: savingsRate >= 20 ? "#5DB872" : "#E8A55A", icon: "sparkles" as IconName, isPercent: true },
        ]).map(({ label, value, color, icon, isPercent }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>{label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "18" }}>
                  <Icon name={icon} size={14} style={{ color }} />
                </div>
              </div>
              <p className="text-[18px] font-bold leading-tight" style={{ color }}>
                {isPercent ? `${value}%` : fmtIDR(Math.abs(value))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Transaction list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Tabs value={txTab} onValueChange={v => setTxTab(v as typeof txTab)}>
              <TabsList>
                <TabsTrigger value="all">Semua</TabsTrigger>
                <TabsTrigger value="income">Pemasukan</TabsTrigger>
                <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>{displayTxs.length} transaksi</span>
          </div>

          {displayTxs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[13px]" style={{ color: "var(--color-muted-soft)" }}>Belum ada transaksi bulan ini.</p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <AnimatePresence initial={false}>
                {displayTxs.map((tx, i) => {
                  const cat = getCat(tx.categoryId);
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 px-4 py-3 group"
                      style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: (cat?.color || "#ccc") + "18" }}>
                        <Icon name={(cat?.icon || "wallet") as IconName} size={14} style={{ color: cat?.color || "#ccc" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>{tx.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>{cat?.name}</span>
                          <span style={{ color: "var(--color-hairline)" }}>·</span>
                          <span className="text-[11px]" style={{ color: "var(--color-muted-soft)" }}>
                            {new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                      <p className="text-[14px] font-bold flex-shrink-0" style={{ color: tx.type === "income" ? "#5DB872" : "#D85A4A" }}>
                        {tx.type === "income" ? "+" : "-"}{fmtIDR(tx.amount)}
                      </p>
                      <button
                        onClick={() => deleteTransaction(tx.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all flex-shrink-0"
                        style={{ color: "#C64545" }}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </Card>
          )}
        </div>

        {/* Category breakdown */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Pengeluaran per Kategori</p>
            </CardHeader>
            <CardContent>
              {catBreakdown.length === 0 ? (
                <p className="text-[12px] text-center py-4" style={{ color: "var(--color-muted-soft)" }}>Belum ada pengeluaran</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {catBreakdown.map(cat => (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Icon name={cat.icon as IconName} size={14} style={{ color: cat.color }} />
                          <span className="text-[12px] font-semibold" style={{ color: "var(--color-ink)" }}>{cat.name}</span>
                        </div>
                        <span className="text-[12px] font-semibold" style={{ color: "var(--color-muted)" }}>{fmtIDR(cat.total)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-canvas)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(cat.total / maxCatTotal) * 100}%`, background: cat.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories list */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Kategori</p>
                <button onClick={() => setShowAddCat(true)} className="text-[11px] font-semibold hover:opacity-70" style={{ color: "#2A9D8F" }}>+ Tambah</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1.5">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2 group py-1">
                    <Icon name={cat.icon as IconName} size={14} style={{ color: cat.color }} />
                    <span className="flex-1 text-[12px] font-medium" style={{ color: "var(--color-ink)" }}>{cat.name}</span>
                    <Badge variant={cat.type === "income" ? "teal" : "gray"} className="text-[9px]">
                      {cat.type === "income" ? "masuk" : "keluar"}
                    </Badge>
                    {!["c1","c2","c3","c4","c5","c6","c7","c8"].includes(cat.id) && (
                      <button onClick={() => deleteCategory(cat.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-all" style={{ color: "#C64545" }}>
                        <Icon name="x" size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddTx} onOpenChange={setShowAddTx}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Transaksi</DialogTitle>
            <DialogDescription>Catat pemasukan atau pengeluaran</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-4">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              {(["income", "expense"] as TransactionType[]).map(t => (
                <button key={t} onClick={() => setTxType(t)} className="py-2.5 rounded-[8px] text-[13px] font-semibold transition-all border"
                  style={txType === t
                    ? t === "income"
                      ? { background: "#5DB87218", borderColor: "#5DB872", color: "#2E7D4F" }
                      : { background: "#D85A4A18", borderColor: "#D85A4A", color: "#9B2B2B" }
                    : { background: "var(--color-surface)", borderColor: "var(--color-hairline)", color: "var(--color-muted)" }}>
                  {t === "income" ? "💰 Pemasukan" : "💸 Pengeluaran"}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Nominal (IDR)</label>
              <Input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Kategori</label>
              <Select value={txCatId} onChange={e => setTxCatId(e.target.value)}>
                <option value="">Pilih kategori...</option>
                {categories.filter(c => c.type === txType).map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Keterangan</label>
              <Input value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder="Nama invoice / keterangan" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Tanggal</label>
              <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddTx(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleAddTx} disabled={!txAmount || !txCatId || !txDesc}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCat} onOpenChange={setShowAddCat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kategori</DialogTitle>
            <DialogDescription>Buat kategori pengeluaran atau pemasukan baru</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              {(["income", "expense"] as TransactionType[]).map(t => (
                <button key={t} onClick={() => setCatType(t)} className="py-2.5 rounded-[8px] text-[13px] font-semibold transition-all border"
                  style={catType === t
                    ? { background: "var(--color-primary-light)", borderColor: "#2A9D8F", color: "#1C4F4F" }
                    : { background: "var(--color-surface)", borderColor: "var(--color-hairline)", color: "var(--color-muted)" }}>
                  {t === "income" ? "Pemasukan" : "Pengeluaran"}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Nama Kategori</label>
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Makan Siang" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(ic => (
                  <button key={ic} onClick={() => setCatIcon(ic)} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                    style={catIcon === ic ? { background: "var(--color-primary-light)", outline: "2px solid #2A9D8F" } : { background: "var(--color-canvas)" }}>
                    <Icon name={ic} size={16} style={{ color: catIcon === ic ? "#2A9D8F" : "var(--color-muted)" }} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>Warna</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => setCatColor(c)} className="w-7 h-7 rounded-full transition-all"
                    style={{ background: c, outline: catColor === c ? `3px solid ${c}` : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddCat(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleAddCat} disabled={!catName.trim()}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </ShellLayout>
  );
}
