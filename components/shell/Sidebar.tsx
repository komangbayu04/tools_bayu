"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems: { label: string; href: string; icon: IconName }[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Template Invoice", href: "/invoice", icon: "file-text" },
  { label: "To do list", href: "/todo", icon: "check-square" },
  { label: "Finance", href: "/finance", icon: "wallet" },
  { label: "Moodboard", href: "/moodboard", icon: "image" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-shrink-0 h-screen flex-col transition-all duration-200"
        style={{
          width: collapsed ? "60px" : "200px",
          background: "var(--color-canvas)",
        }}
      >
        {/* Logo */}
        <div
          className={cn("pt-7 pb-8", collapsed ? "px-[11px]" : "px-5")}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-[#1C4F4F] flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg leading-none">L</span>
            </div>
            {!collapsed && (
              <span
                className="font-bold text-[15px] tracking-tight whitespace-nowrap overflow-hidden"
                style={{ color: "var(--color-primary-ink)" }}
              >
                Layla
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 flex flex-col gap-0.5"
          style={{ padding: collapsed ? "0 8px" : "0 12px" }}
        >
          {navItems.map(({ label, href, icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <div key={href} className="relative group">
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150",
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
                    style={{ color: isActive ? "#2A9D8F" : "var(--color-muted-soft)" }}
                  />
                  {!collapsed && label}
                </Link>
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div
                    className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md text-[12px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    style={{ background: "var(--color-ink)", color: "var(--color-canvas)" }}
                  >
                    {label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div
          className="flex flex-col gap-0.5"
          style={{ padding: collapsed ? "0 8px 24px" : "0 12px 24px" }}
        >
          <div className="h-px mb-3" style={{ background: "var(--color-hairline)" }} />

          {/* Settings */}
          <div className="relative group">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150",
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
                style={{ color: pathname === "/settings" ? "#2A9D8F" : "var(--color-muted-soft)" }}
              />
              {!collapsed && "Settings"}
            </Link>
            {collapsed && (
              <div
                className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md text-[12px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50"
                style={{ background: "var(--color-ink)", color: "var(--color-canvas)" }}
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
                "flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 w-full",
                collapsed ? "justify-center px-0" : "px-3 text-left"
              )}
              style={{ color: "var(--color-muted)" }}
            >
              {theme === "dark" ? (
                <Icon name="sun" size={17} style={{ color: "var(--color-muted-soft)" }} />
              ) : (
                <Icon name="moon" size={17} style={{ color: "var(--color-muted-soft)" }} />
              )}
              {!collapsed && (theme === "dark" ? "Light Mode" : "Dark Mode")}
            </button>
            {collapsed && (
              <div
                className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md text-[12px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50"
                style={{ background: "var(--color-ink)", color: "var(--color-canvas)" }}
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </div>
            )}
          </div>

          {/* Collapse toggle button */}
          <div className="relative group">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 w-full mt-1",
                collapsed ? "justify-center px-0" : "px-3 text-left"
              )}
              style={{ color: "var(--color-muted-soft)" }}
            >
              <Icon name={collapsed ? "chevron-right" : "chevron-left"} size={14} />
              {!collapsed && "Collapse"}
            </button>
            {collapsed && (
              <div
                className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md text-[12px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50"
                style={{ background: "var(--color-ink)", color: "var(--color-canvas)" }}
              >
                Expand
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
