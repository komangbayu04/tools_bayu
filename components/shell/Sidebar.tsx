"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems: { label: string; href: string; icon: IconName }[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Template Invoice", href: "/invoice", icon: "file-text" },
  { label: "To do list", href: "/todo", icon: "check-square" },
  { label: "Finance", href: "/finance", icon: "wallet" },
  { label: "Moodboard", href: "/moodboard", icon: "image" },
];

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Persist collapse state in localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  const toggle = (next: boolean) => {
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-shrink-0 h-screen flex-col overflow-hidden"
        style={{
          width: collapsed ? "64px" : "200px",
          background: "var(--color-canvas)",
          transition: "width 250ms cubic-bezier(0.4,0,0.2,1)",
          marginRight: "4px",
        }}
      >
        {/* Logo + collapse toggle */}
        <div className="pt-7 pb-8 px-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Logo icon — hover shows expand arrow only when collapsed */}
            {collapsed ? (
              <button
                onClick={() => toggle(false)}
                className="group relative w-9 h-9 mx-auto rounded-xl bg-[#1C4F4F] flex items-center justify-center shadow-sm flex-shrink-0"
                style={{ transition: "background 150ms" }}
                aria-label="Expand sidebar"
              >
                <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 group-hover:opacity-0">
                  <span className="text-white font-bold text-lg leading-none">L</span>
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <Icon name="chevron-right" size={16} className="text-white" />
                </span>
              </button>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-[#1C4F4F] flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-white font-bold text-lg leading-none">L</span>
                </div>
                <span
                  className="font-bold text-[15px] tracking-tight whitespace-nowrap flex-1 min-w-0 overflow-hidden"
                  style={{
                    color: "var(--color-primary-ink)",
                    opacity: mounted ? 1 : 0,
                    transition: "opacity 180ms 60ms",
                  }}
                >
                  Layla
                </span>
                <button
                  onClick={() => toggle(true)}
                  className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--color-hairline)]"
                  style={{ color: "var(--color-muted-soft)" }}
                  aria-label="Collapse sidebar"
                >
                  <Icon name="chevron-left" size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-hidden">
          {navItems.map(({ label, href, icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <div key={href} className="relative group">
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors duration-150",
                    collapsed ? "justify-center px-0" : "px-3",
                    isActive ? "text-[#1C4F4F]" : "hover:text-[var(--color-body)]"
                  )}
                  style={
                    isActive
                      ? { background: "var(--color-primary-light)" }
                      : { color: "var(--color-muted)" }
                  }
                >
                  <Icon
                    name={icon}
                    size={17}
                    style={{ flexShrink: 0, color: isActive ? "#2A9D8F" : "var(--color-muted-soft)" }}
                  />
                  {!collapsed && (
                    <span
                      className="whitespace-nowrap overflow-hidden"
                      style={{
                        opacity: mounted ? 1 : 0,
                        transition: "opacity 150ms 50ms",
                      }}
                    >
                      {label}
                    </span>
                  )}
                </Link>
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div
                    className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 z-50"
                    style={{
                      background: "var(--color-ink)",
                      color: "var(--color-canvas)",
                      transition: "opacity 120ms",
                    }}
                  >
                    {label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-6 flex flex-col gap-0.5 flex-shrink-0">
          <div className="h-px mb-3 mx-1" style={{ background: "var(--color-hairline)" }} />

          {/* Settings */}
          <div className="relative group">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors duration-150",
                collapsed ? "justify-center px-0" : "px-3",
                pathname === "/settings" ? "text-[#1C4F4F]" : ""
              )}
              style={
                pathname === "/settings"
                  ? { background: "var(--color-primary-light)" }
                  : { color: "var(--color-muted)" }
              }
            >
              <Icon
                name="settings"
                size={17}
                style={{ flexShrink: 0, color: pathname === "/settings" ? "#2A9D8F" : "var(--color-muted-soft)" }}
              />
              {!collapsed && (
                <span className="whitespace-nowrap overflow-hidden" style={{ opacity: mounted ? 1 : 0, transition: "opacity 150ms 50ms" }}>
                  Settings
                </span>
              )}
            </Link>
            {collapsed && (
              <div
                className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 z-50"
                style={{ background: "var(--color-ink)", color: "var(--color-canvas)", transition: "opacity 120ms" }}
              >
                Settings
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <div className="relative group">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors duration-150 w-full",
                collapsed ? "justify-center px-0" : "px-3 text-left"
              )}
              style={{ color: "var(--color-muted)" }}
            >
              {theme === "dark" ? (
                <Icon name="sun" size={17} style={{ flexShrink: 0, color: "var(--color-muted-soft)" }} />
              ) : (
                <Icon name="moon" size={17} style={{ flexShrink: 0, color: "var(--color-muted-soft)" }} />
              )}
              {!collapsed && (
                <span className="whitespace-nowrap overflow-hidden" style={{ opacity: mounted ? 1 : 0, transition: "opacity 150ms 50ms" }}>
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
              )}
            </button>
            {collapsed && (
              <div
                className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 z-50"
                style={{ background: "var(--color-ink)", color: "var(--color-canvas)", transition: "opacity 120ms" }}
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 z-50 border-t"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-hairline)" }}
      >
        {navItems.map(({ href, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center p-2.5 rounded-xl transition-colors"
              style={{ color: isActive ? "#2A9D8F" : "var(--color-muted-soft)" }}
            >
              <Icon name={icon} size={22} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
