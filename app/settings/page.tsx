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
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Display name</label>
                <Input defaultValue="Bayu Krisnayana" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Studio</label>
                <Input defaultValue="Kamarupa Design Group" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-muted)" }}>Email</label>
                <Input defaultValue="bayuajoes321@gmail.com" />
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
