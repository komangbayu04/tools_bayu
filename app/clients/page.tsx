"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useClientStore, type Client, type ClientStatus } from "@/lib/store";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, isBefore, startOfDay } from "date-fns";

const fmtIDR = (n: number) => "IDR " + new Intl.NumberFormat("en-US").format(Math.round(n));

const STATUS: Record<ClientStatus, { label: string; variant: "gray" | "teal" | "low" | "medium" | "high" | "purple" }> = {
  lead: { label: "Lead", variant: "gray" },
  negotiation: { label: "Negosiasi", variant: "medium" },
  active: { label: "Aktif", variant: "teal" },
  completed: { label: "Selesai", variant: "low" },
  lost: { label: "Lost", variant: "high" },
};
const STATUS_ORDER: ClientStatus[] = ["lead", "negotiation", "active", "completed", "lost"];

const emptyForm = (): Omit<Client, "id" | "createdAt"> => ({
  name: "", company: "", email: "", phone: "", status: "lead",
  dealValue: undefined, rate: undefined, notes: "", followUpDate: "",
});

export default function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient } = useClientStore();
  const [filter, setFilter] = useState<ClientStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({ name: c.name, company: c.company ?? "", email: c.email ?? "", phone: c.phone ?? "", status: c.status, dealValue: c.dealValue, rate: c.rate, notes: c.notes ?? "", followUpDate: c.followUpDate ?? "" });
    setDialogOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) return;
    if (editingId) updateClient(editingId, form);
    else addClient(form);
    setDialogOpen(false);
  };

  const filtered = useMemo(
    () => (filter === "all" ? clients : clients.filter((c) => c.status === filter)),
    [clients, filter]
  );

  const today = startOfDay(new Date());
  const pipelineValue = clients.filter((c) => c.status !== "lost" && c.status !== "completed").reduce((s, c) => s + (c.dealValue ?? 0), 0);
  const activeCount = clients.filter((c) => c.status === "active").length;
  const dueFollowUps = clients.filter((c) => c.followUpDate && !isBefore(today, new Date(c.followUpDate)) && c.status !== "lost" && c.status !== "completed");

  const stats = [
    { label: "Total Klien", value: String(clients.length), icon: "user" as const },
    { label: "Klien Aktif", value: String(activeCount), icon: "check-circle" as const },
    { label: "Nilai Pipeline", value: fmtIDR(pipelineValue), icon: "money-bill" as const },
    { label: "Follow-up Jatuh Tempo", value: String(dueFollowUps.length), icon: "flag" as const },
  ];

  return (
    <ShellLayout>
      <PageHeader
        title="Klien (CRM)"
        subtitle="Kelola lead, negosiasi, sampai proyek aktif"
        actions={<Button onClick={openNew}><Icon name="plus" size={15} /> Tambah Klien</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[14px] border p-4" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon name={s.icon} size={14} style={{ color: "var(--color-primary)" }} />
              <span className="text-[11.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>{s.label}</span>
            </div>
            <p className="text-[20px] font-bold tracking-tight" style={{ color: "var(--color-ink)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(["all", ...STATUS_ORDER] as const).map((s) => {
          const isActive = filter === s;
          const label = s === "all" ? "Semua" : STATUS[s].label;
          const count = s === "all" ? clients.length : clients.filter((c) => c.status === s).length;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all"
              style={isActive
                ? { background: "var(--color-primary)", borderColor: "var(--color-primary)", color: "var(--color-on-primary)" }
                : { background: "var(--color-surface-card)", borderColor: "var(--color-hairline)", color: "var(--color-muted)" }}>
              {label} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Client cards */}
      {filtered.length === 0 ? (
        <div className="rounded-[14px] border border-dashed flex flex-col items-center text-center py-16 px-6" style={{ borderColor: "var(--color-hairline)" }}>
          <Icon name="user" size={28} style={{ color: "var(--color-muted-soft)" }} />
          <p className="mt-3 text-[14px] font-medium" style={{ color: "var(--color-ink)" }}>Belum ada klien</p>
          <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>Tambah klien pertama untuk mulai melacak pipeline.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => {
            const overdue = c.followUpDate && !isBefore(today, new Date(c.followUpDate)) && c.status !== "lost" && c.status !== "completed";
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-[14px] border p-5 flex flex-col gap-3 group" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold truncate" style={{ color: "var(--color-ink)" }}>{c.name}</p>
                    {c.company && <p className="text-[12.5px] truncate" style={{ color: "var(--color-muted)" }}>{c.company}</p>}
                  </div>
                  <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
                </div>

                <div className="flex flex-col gap-1 text-[12.5px]" style={{ color: "var(--color-muted)" }}>
                  {c.email && <span className="flex items-center gap-2 truncate"><Icon name="email" size={12} /> {c.email}</span>}
                  {c.phone && <span className="flex items-center gap-2"><Icon name="phone" size={12} /> {c.phone}</span>}
                  {typeof c.dealValue === "number" && c.dealValue > 0 && (
                    <span className="flex items-center gap-2"><Icon name="money-bill" size={12} /> {fmtIDR(c.dealValue)}</span>
                  )}
                  {c.followUpDate && (
                    <span className="flex items-center gap-2" style={overdue ? { color: "#C64545", fontWeight: 600 } : undefined}>
                      <Icon name="flag" size={12} /> Follow-up: {format(new Date(c.followUpDate), "d MMM yyyy")}{overdue ? " (jatuh tempo)" : ""}
                    </span>
                  )}
                </div>

                {c.notes && <p className="text-[12.5px] line-clamp-2" style={{ color: "var(--color-muted)" }}>{c.notes}</p>}

                <div className="flex items-center gap-2 mt-auto pt-1">
                  <Select value={c.status} onChange={(e) => updateClient(c.id, { status: e.target.value as ClientStatus })} className="flex-1 py-1.5 text-[12.5px]">
                    {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                  </Select>
                  <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-[var(--color-canvas)]" style={{ color: "var(--color-muted)" }}><Icon name="edit" size={14} /></button>
                  <button onClick={() => deleteClient(c.id)} className="p-2 rounded-lg hover:bg-red-50" style={{ color: "#C64545" }}><Icon name="trash" size={14} /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Klien" : "Tambah Klien"}</DialogTitle>
            <DialogDescription>Lacak kontak dan status deal klien.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-6 pb-6 pt-4">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama klien *" />
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Perusahaan" />
            <div className="grid grid-cols-2 gap-2.5">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telepon" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Status</label>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>
                  {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Follow-up</label>
                <Input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Nilai Deal (IDR)</label>
                <Input type="number" value={form.dealValue ?? ""} onChange={(e) => setForm({ ...form, dealValue: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Rate/Jam (IDR)</label>
                <Input type="number" value={form.rate ?? ""} onChange={(e) => setForm({ ...form, rate: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" />
              </div>
            </div>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Catatan" />
            <div className="flex justify-end gap-2 mt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={save}>{editingId ? "Simpan" : "Tambah"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ShellLayout>
  );
}
