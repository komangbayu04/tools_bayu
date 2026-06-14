"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Icon, type IconName } from "@/components/ui/icon";
import { usePalette, PALETTES } from "@/lib/usePalette";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette, mounted } = usePalette();
  const isDark = mounted && theme === "dark";

  const themeOptions: { key: string; label: string; icon: IconName }[] = [
    { key: "light", label: "Light", icon: "sun" },
    { key: "dark", label: "Dark", icon: "moon" },
    { key: "system", label: "System", icon: "monitor" },
  ];

  return (
    <ShellLayout>
      <PageHeader title="Settings" subtitle="Manage your workspace preferences" />

      <div className="flex flex-col gap-5 max-w-2xl">
        {/* Color theme */}
        <Card>
          <CardHeader>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Color Theme</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>Pick the accent palette for the whole app</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PALETTES.map((p) => (
                <PaletteSwatch
                  key={p.key}
                  data={p}
                  dark={isDark}
                  selected={mounted && palette === p.key}
                  onSelect={() => setPalette(p.key)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Appearance</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>Choose light or dark mode</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className="flex flex-col items-center gap-2 py-5 rounded-[12px] border transition-all hover:-translate-y-0.5"
                  style={
                    mounted && theme === key
                      ? { borderColor: "var(--color-primary)", background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }
                      : { borderColor: "var(--color-hairline)", color: "var(--color-muted)" }
                  }
                >
                  <Icon name={icon} size={20} />
                  <span className="text-[13px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Profile</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>Used as defaults across documents</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Display name" value="Bayu Krisnayana" />
                <Field label="Email" value="bayuajoes321@gmail.com" />
              </div>
              <Field label="Phone" value="+6285 792 352 806" />
              <Field label="Address" value="Jln. Dewi Sartika No.19, Semarapura Kaja, Klungkung, Bali, Indonesia, 80711" />
              <div>
                <Button className="w-fit">Save changes</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment / Bank details */}
        <Card>
          <CardHeader>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Payment Details</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>Pre-filled into every invoice</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Field label="Bank Name" value="BCA (Bank Central Asia)" />
              <Field label="Account Holder Name" value="I Komang Bayu Krisnayana" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Account No" value="3950456514" />
                <Field label="Swift Code" value="CENAIDJA" />
                <Field label="Bank Code" value="014" />
                <Field label="Branch Code" value="0395" />
              </div>
              <div>
                <Button className="w-fit">Save changes</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ShellLayout>
  );
}

function PaletteSwatch({
  data,
  dark,
  selected,
  onSelect,
}: {
  data: (typeof PALETTES)[number];
  dark: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const c = dark ? data.dark : data.light;
  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col gap-2.5 rounded-[14px] border p-2.5 text-left transition-all duration-150 hover:-translate-y-1"
      style={{
        borderColor: selected ? "var(--color-primary)" : "var(--color-hairline)",
        boxShadow: selected ? "0 0 0 2px var(--color-primary)" : "var(--shadow-card)",
      }}
      aria-pressed={selected}
    >
      {/* Mini app preview built from this palette's literal colors */}
      <div
        className="relative h-[68px] w-full overflow-hidden rounded-[9px]"
        style={{ background: c.canvas }}
      >
        {/* sidebar rail */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5" style={{ background: c.surface }} />
        {/* card */}
        <div
          className="absolute left-4 right-2 top-2 bottom-2 rounded-[6px] p-2"
          style={{ background: c.surface, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
        >
          <div className="h-1.5 w-8 rounded-full" style={{ background: c.ink, opacity: 0.85 }} />
          <div className="mt-1.5 flex items-center gap-1">
            <div className="h-3.5 w-3.5 rounded-full" style={{ background: c.primary }} />
            <div className="h-1 w-6 rounded-full" style={{ background: c.tint }} />
          </div>
          <div className="mt-1.5 h-3 w-9 rounded-[4px]" style={{ background: c.primary }} />
        </div>
      </div>

      {/* Color dots */}
      <div className="flex items-center gap-1 px-0.5">
        {[c.primary, c.tint, c.ink].map((col, i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-full"
            style={{ background: col, border: "1px solid rgba(0,0,0,0.08)" }}
          />
        ))}
      </div>

      <div className="px-0.5">
        <p className="text-[12px] font-semibold leading-tight" style={{ color: "var(--color-ink)" }}>
          {data.label}
        </p>
        <p className="text-[10px] leading-tight" style={{ color: "var(--color-muted)" }}>
          {data.description}
        </p>
      </div>

      {/* Selected check */}
      {selected && (
        <span
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          <Icon name="check" size={11} />
        </span>
      )}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>{label}</label>
      <Input defaultValue={value} />
    </div>
  );
}
