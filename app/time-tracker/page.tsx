"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import {
  useTimeTrackerStore,
  useClientStore,
  useInvoicePrefillStore,
  type TimeEntry,
} from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const fmtIDR = (n: number) => "IDR " + new Intl.NumberFormat("en-US").format(Math.round(n));
const pad = (n: number) => String(n).padStart(2, "0");
const fmtClock = (sec: number) => `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
const fmtHours = (sec: number) => (sec / 3600).toFixed(2);
const entryValue = (e: TimeEntry) => (e.seconds / 3600) * e.rate;

export default function TimeTrackerPage() {
  const router = useRouter();
  const { entries, active, startTimer, stopTimer, cancelTimer, addManualEntry, deleteEntry, markBilled } = useTimeTrackerStore();
  const { clients } = useClientStore();
  const setPrefill = useInvoicePrefillStore((s) => s.setPrefill);

  // Live tick for the running timer
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Timer form
  const [desc, setDesc] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [rate, setRate] = useState(100000);

  // Manual entry form
  const [showManual, setShowManual] = useState(false);
  const [mDesc, setMDesc] = useState("");
  const [mClient, setMClient] = useState("");
  const [mProject, setMProject] = useState("");
  const [mHours, setMHours] = useState(1);
  const [mRate, setMRate] = useState(100000);
  const [mDate, setMDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Selection for invoicing
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const elapsed = active ? Math.max(0, Math.round((now - active.startedAt) / 1000)) : 0;

  const handleStart = () => {
    startTimer({ description: desc.trim() || "Sesi kerja", projectName: projectName.trim() || undefined, clientName: clientName.trim() || undefined, rate });
    setDesc("");
  };

  const handleManualAdd = () => {
    if (!mDesc.trim()) return;
    addManualEntry({
      description: mDesc.trim(),
      clientName: mClient.trim() || undefined,
      projectName: mProject.trim() || undefined,
      seconds: Math.round(mHours * 3600),
      rate: mRate,
      date: mDate,
    });
    setMDesc(""); setMProject(""); setMHours(1);
    setShowManual(false);
  };

  const unbilled = useMemo(() => entries.filter((e) => !e.billed), [entries]);
  const billed = useMemo(() => entries.filter((e) => e.billed), [entries]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const selectedEntries = unbilled.filter((e) => selected.has(e.id));
  const selectAllUnbilled = () =>
    setSelected((prev) => (prev.size === unbilled.length ? new Set() : new Set(unbilled.map((e) => e.id))));

  const totalUnbilledHours = unbilled.reduce((s, e) => s + e.seconds, 0) / 3600;
  const totalUnbilledValue = unbilled.reduce((s, e) => s + entryValue(e), 0);
  const selectedValue = selectedEntries.reduce((s, e) => s + entryValue(e), 0);

  const handleCreateInvoice = () => {
    if (!selectedEntries.length) return;
    const rateForInvoice = selectedEntries[0].rate;
    const clientForInvoice = selectedEntries.find((e) => e.clientName)?.clientName ?? "";
    setPrefill({
      clientName: clientForInvoice,
      rate: rateForInvoice,
      items: selectedEntries.map((e) => ({
        date: e.date,
        project: e.projectName ?? "",
        title: e.description,
        tasks: e.description,
        hours: Number(fmtHours(e.seconds)),
      })),
    });
    markBilled(selectedEntries.map((e) => e.id));
    router.push("/invoice");
  };

  const clientNames = [...new Set(clients.map((c) => c.name))];

  return (
    <ShellLayout>
      <PageHeader
        title="Time Tracker"
        subtitle="Catat jam kerja per proyek lalu ubah jadi invoice"
        actions={
          <Button variant="outline" onClick={() => setShowManual((v) => !v)}>
            <Icon name="plus" size={15} /> Entry Manual
          </Button>
        }
      />

      {/* ── TIMER ── */}
      <div className="rounded-[14px] border p-6 mb-5" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold mb-1 truncate" style={{ color: "var(--color-ink)" }}>{active.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-[12px]" style={{ color: "var(--color-muted)" }}>
                  {active.projectName && <Badge variant="teal">{active.projectName}</Badge>}
                  {active.clientName && <span>· {active.clientName}</span>}
                  <span>· {fmtIDR(active.rate)}/jam</span>
                </div>
              </div>
              <div className="text-[40px] font-bold tabular-nums tracking-tight" style={{ color: "var(--color-primary-ink)" }}>
                {fmtClock(elapsed)}
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={stopTimer}><Icon name="stop" size={14} className="mr-1.5" /> Stop & Simpan</Button>
                <Button variant="outline" onClick={cancelTimer}><Icon name="x" size={14} /></Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Sedang mengerjakan apa?" className="bg-[var(--color-surface)]" onKeyDown={(e) => e.key === "Enter" && handleStart()} />
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_160px_auto] gap-2.5">
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Proyek" className="bg-[var(--color-surface)]" />
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Klien" list="tt-clients" className="bg-[var(--color-surface)]" />
                <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} placeholder="Rate/jam" className="bg-[var(--color-surface)]" />
                <Button onClick={handleStart}><Icon name="play" size={14} className="mr-1.5" /> Mulai</Button>
              </div>
              <datalist id="tt-clients">{clientNames.map((n) => <option key={n} value={n} />)}</datalist>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── MANUAL ENTRY ── */}
      <AnimatePresence>
        {showManual && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5">
            <div className="rounded-[14px] border p-5 flex flex-col gap-3" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
              <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Entry Manual</p>
              <Input value={mDesc} onChange={(e) => setMDesc(e.target.value)} placeholder="Deskripsi pekerjaan" className="bg-[var(--color-surface)]" />
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <Input value={mProject} onChange={(e) => setMProject(e.target.value)} placeholder="Proyek" className="bg-[var(--color-surface)]" />
                <Input value={mClient} onChange={(e) => setMClient(e.target.value)} placeholder="Klien" list="tt-clients" className="bg-[var(--color-surface)]" />
                <Input type="number" step="0.25" value={mHours} onChange={(e) => setMHours(Number(e.target.value))} placeholder="Jam" className="bg-[var(--color-surface)]" />
                <Input type="number" value={mRate} onChange={(e) => setMRate(Number(e.target.value))} placeholder="Rate/jam" className="bg-[var(--color-surface)]" />
                <Input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className="bg-[var(--color-surface)]" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowManual(false)}>Batal</Button>
                <Button size="sm" onClick={handleManualAdd}>Tambah</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── UNBILLED + INVOICE ACTION ── */}
      <div className="rounded-[14px] border overflow-hidden" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--color-hairline)" }}>
          <div className="flex items-center gap-2">
            <Icon name="clock" size={16} style={{ color: "var(--color-primary)" }} />
            <span className="font-semibold text-[15px]" style={{ color: "var(--color-ink)" }}>Belum Ditagih</span>
            <Badge variant="gray">{totalUnbilledHours.toFixed(2)} jam · {fmtIDR(totalUnbilledValue)}</Badge>
          </div>
          {unbilled.length > 0 && (
            <button onClick={selectAllUnbilled} className="text-[12px] font-semibold hover:opacity-70" style={{ color: "var(--color-primary)" }}>
              {selected.size === unbilled.length ? "Batal pilih" : "Pilih semua"}
            </button>
          )}
        </div>

        {unbilled.length === 0 ? (
          <div className="py-12 text-center text-[13px]" style={{ color: "var(--color-muted)" }}>
            Belum ada catatan waktu. Mulai timer di atas.
          </div>
        ) : (
          <div className="flex flex-col">
            {unbilled.map((e) => {
              const isSel = selected.has(e.id);
              return (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3.5 border-b last:border-b-0 group" style={{ borderColor: "var(--color-hairline)" }}>
                  <button onClick={() => toggleSelect(e.id)} className="w-5 h-5 rounded-[6px] border flex items-center justify-center flex-shrink-0 transition-colors"
                    style={isSel ? { background: "var(--color-primary)", borderColor: "var(--color-primary)" } : { borderColor: "var(--color-hairline)" }}>
                    {isSel && <Icon name="check" size={12} style={{ color: "var(--color-on-primary)" }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium truncate" style={{ color: "var(--color-ink)" }}>{e.description}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]" style={{ color: "var(--color-muted)" }}>
                      <span>{format(new Date(e.date), "d MMM yyyy")}</span>
                      {e.projectName && <span>· {e.projectName}</span>}
                      {e.clientName && <span>· {e.clientName}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13.5px] font-semibold tabular-nums" style={{ color: "var(--color-ink)" }}>{fmtHours(e.seconds)} jam</p>
                    <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>{fmtIDR(entryValue(e))}</p>
                  </div>
                  <button onClick={() => deleteEntry(e.id)} className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#C64545" }}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky invoice bar */}
        <AnimatePresence>
          {selectedEntries.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex items-center justify-between gap-3 px-5 py-4 border-t" style={{ borderColor: "var(--color-hairline)", background: "var(--color-primary-light)" }}>
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-primary-ink)" }}>
                {selectedEntries.length} entry dipilih · {fmtIDR(selectedValue)}
              </p>
              <Button onClick={handleCreateInvoice}><Icon name="receipt" size={14} className="mr-1.5" /> Buat Invoice</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BILLED HISTORY ── */}
      {billed.length > 0 && (
        <div className="mt-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider mb-2.5 px-1" style={{ color: "var(--color-muted)" }}>Sudah Ditagih</p>
          <div className="rounded-[14px] border overflow-hidden" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
            {billed.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3 border-b last:border-b-0 group opacity-70" style={{ borderColor: "var(--color-hairline)" }}>
                <Icon name="check-circle" size={15} style={{ color: "#16a34a", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] truncate" style={{ color: "var(--color-ink)" }}>{e.description}</p>
                  <p className="text-[11.5px]" style={{ color: "var(--color-muted)" }}>{format(new Date(e.date), "d MMM yyyy")}{e.clientName ? ` · ${e.clientName}` : ""}</p>
                </div>
                <p className="text-[12.5px] tabular-nums" style={{ color: "var(--color-muted)" }}>{fmtHours(e.seconds)} jam</p>
                <button onClick={() => deleteEntry(e.id)} className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#C64545" }}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </ShellLayout>
  );
}
