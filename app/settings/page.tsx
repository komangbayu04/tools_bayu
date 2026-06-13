"use client";

import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { key: "light", label: "Light", icon: Sun },
    { key: "dark", label: "Dark", icon: Moon },
    { key: "system", label: "System", icon: Monitor },
  ];

  return (
    <ShellLayout>
      <PageHeader title="Settings" subtitle="Manage your workspace preferences" />

      <div className="flex flex-col gap-5 max-w-2xl">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>Appearance</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>Choose how the dashboard looks</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className="flex flex-col items-center gap-2 py-5 rounded-[12px] border transition-all"
                  style={
                    theme === key
                      ? { borderColor: "#2A9D8F", background: "var(--color-primary-light)", color: "#1C4F4F" }
                      : { borderColor: "var(--color-hairline)", color: "var(--color-muted)" }
                  }
                >
                  <Icon size={20} />
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>{label}</label>
      <Input defaultValue={value} />
    </div>
  );
}
