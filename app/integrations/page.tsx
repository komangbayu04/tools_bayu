"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useIntegrationStore } from "@/lib/store";
import { useState } from "react";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200"
      style={{ background: checked ? "var(--color-primary)" : "var(--color-hairline)" }}
      role="switch"
      aria-checked={checked}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg transform transition-transform duration-200"
        style={{
          background: "white",
          transform: checked ? "translateX(20px)" : "translateX(0px)",
        }}
      />
    </button>
  );
}

interface IntegrationCardProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  status: "connected" | "configured" | "not_connected";
  enabled?: boolean;
  onToggle?: (v: boolean) => void;
  children?: React.ReactNode;
}

function IntegrationCard({ icon, iconColor, iconBg, title, description, status, enabled, onToggle, children }: IntegrationCardProps) {
  const statusMeta = {
    connected: { label: "Terhubung", color: "#16a34a", bg: "#f0fdf4" },
    configured: { label: "Dikonfigurasi", color: "#0d9488", bg: "#f0fdfa" },
    not_connected: { label: "Tidak aktif", color: "var(--color-muted)", bg: "var(--color-canvas)" },
  }[status];

  return (
    <div className="rounded-[14px] border p-5" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
            <Icon name={icon as never} size={18} style={{ color: iconColor }} />
          </div>
          <div>
            <p className="text-[14.5px] font-semibold" style={{ color: "var(--color-ink)" }}>{title}</p>
            <p className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full" style={{ color: statusMeta.color, background: statusMeta.bg }}>
            {statusMeta.label}
          </span>
          {onToggle !== undefined && (
            <Toggle checked={!!enabled} onChange={onToggle} />
          )}
        </div>
      </div>
      {children && <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-hairline)" }}>{children}</div>}
    </div>
  );
}

export default function IntegrationsPage() {
  const { settings, update } = useIntegrationStore();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const save = (patch: Parameters<typeof update>[0], msg: string) => {
    update(patch);
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2000);
  };

  return (
    <ShellLayout>
      <PageHeader
        title="Integrasi"
        subtitle="Kelola sumber data dan layanan yang terhubung ke dashboard"
      />

      {savedMsg && (
        <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-[12px] text-[13px] font-medium"
          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }}>
          <Icon name="check-circle" size={15} />
          {savedMsg}
        </div>
      )}

      {/* ── JOB SOURCES ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="briefcase" size={15} style={{ color: "var(--color-primary)" }} />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Sumber Job</h2>
        </div>
        <div className="flex flex-col gap-3">
          {/* Remotive */}
          <IntegrationCard
            icon="briefcase"
            iconColor="#0d9488"
            iconBg="#f0fdfa"
            title="Remotive"
            description="Remote jobs dari 100+ perusahaan teknologi global. Gratis, tanpa API key."
            status={settings.remotive ? "connected" : "not_connected"}
            enabled={settings.remotive}
            onToggle={(v) => save({ remotive: v }, "Pengaturan Remotive disimpan.")}
          />

          {/* LinkedIn */}
          <IntegrationCard
            icon="user"
            iconColor="#0A66C2"
            iconBg="#eff6ff"
            title="LinkedIn Jobs"
            description="Job listing dari LinkedIn. Tidak perlu akun — menggunakan pencarian publik LinkedIn."
            status={settings.linkedin ? "connected" : "not_connected"}
            enabled={settings.linkedin}
            onToggle={(v) => save({ linkedin: v }, "Pengaturan LinkedIn disimpan.")}
          >
            {settings.linkedin && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>
                  Lokasi Preferensi (untuk LinkedIn)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={settings.linkedinLocation}
                    onChange={(e) => update({ linkedinLocation: e.target.value })}
                    placeholder="Remote, Indonesia, Singapore, United States…"
                    className="max-w-xs"
                  />
                  <button
                    onClick={() => save({ linkedinLocation: settings.linkedinLocation }, "Lokasi LinkedIn disimpan.")}
                    className="px-3 py-2 rounded-[8px] text-[13px] font-semibold transition-colors"
                    style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}
                  >
                    Simpan
                  </button>
                </div>
                <p className="mt-1.5 text-[12px]" style={{ color: "var(--color-muted)" }}>
                  Contoh: <span className="font-medium">Remote</span>, <span className="font-medium">Indonesia</span>, <span className="font-medium">Singapore</span>
                </p>
              </div>
            )}
          </IntegrationCard>
        </div>
      </section>

      {/* ── AI ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="robot" size={15} style={{ color: "var(--color-primary)" }} />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>AI Provider</h2>
        </div>
        <IntegrationCard
          icon="sparkles"
          iconColor="#7c3aed"
          iconBg="#f5f3ff"
          title="OpenAI GPT-4o"
          description="Digunakan untuk AI Chat, Workflow Runner, Proposal Generator, Design Assistant, dan Sitemap Generator."
          status="connected"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] border" style={{ borderColor: "var(--color-hairline)", background: "var(--color-canvas)" }}>
              <Icon name="check-circle" size={14} style={{ color: "#16a34a" }} />
              <span className="text-[13px] font-mono" style={{ color: "var(--color-muted)" }}>sk-proj-••••••••••••••••••••••</span>
            </div>
            <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
              Diatur via <span className="font-mono font-medium">OPENAI_API_KEY</span> di environment variables Vercel.
            </p>
          </div>
        </IntegrationCard>
      </section>

      {/* ── STORAGE ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="database" size={15} style={{ color: "var(--color-primary)" }} />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Penyimpanan Data</h2>
        </div>
        <IntegrationCard
          icon="upload-cloud"
          iconColor="#0d9488"
          iconBg="#f0fdfa"
          title="Supabase"
          description="Semua data dashboard (task, invoice, finance, workflow, klien, dll) disinkronkan ke Supabase secara real-time per akun."
          status="connected"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12.5px]">
            {[
              { label: "Auth", desc: "Email + password, session per-user" },
              { label: "Database", desc: "app_state + shared_invoices (PostgreSQL)" },
              { label: "Row Level Security", desc: "Setiap user hanya akses data miliknya" },
            ].map((item) => (
              <div key={item.label} className="rounded-[10px] p-3" style={{ background: "var(--color-canvas)" }}>
                <p className="font-semibold mb-0.5" style={{ color: "var(--color-ink)" }}>{item.label}</p>
                <p style={{ color: "var(--color-muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </IntegrationCard>
      </section>

      {/* ── COMING SOON ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Icon name="calendar" size={15} style={{ color: "var(--color-muted-soft)" }} />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted-soft)" }}>Segera Hadir</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: "building", iconColor: "#6366f1", iconBg: "#eef2ff", title: "Notion", desc: "Sinkronkan task & catatan ke Notion workspace." },
            { icon: "send", iconColor: "#059669", iconBg: "#ecfdf5", title: "Slack / WhatsApp", desc: "Notifikasi jatuh tempo invoice & follow-up klien." },
            { icon: "file-text", iconColor: "#d97706", iconBg: "#fffbeb", title: "Google Drive", desc: "Simpan proposal & kontrak langsung ke Drive." },
            { icon: "briefcase", iconColor: "#64748b", iconBg: "#f8fafc", title: "Upwork", desc: "Sinkronkan proposal & riwayat kontrak dari Upwork." },
          ].map((item) => (
            <div key={item.title} className="rounded-[14px] border p-4 opacity-50" style={{ background: "var(--color-surface-card)", borderColor: "var(--color-hairline)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[9px] flex items-center justify-center" style={{ background: item.iconBg }}>
                  <Icon name={item.icon as never} size={16} style={{ color: item.iconColor }} />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold" style={{ color: "var(--color-ink)" }}>{item.title}</p>
                  <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ShellLayout>
  );
}
