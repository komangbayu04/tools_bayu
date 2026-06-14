"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LayoutDashboard, FileText, CheckSquare, Image, Wallet, Settings, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Template Invoice", href: "/invoice", icon: FileText },
  { label: "To do list", href: "/todo", icon: CheckSquare },
  { label: "Finance", href: "/finance", icon: Wallet },
  { label: "Moodboard", href: "/moodboard", icon: Image },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-[200px] flex-shrink-0 h-screen flex-col"
        style={{ background: "var(--color-canvas)" }}
      >
        {/* Logo */}
        <div className="px-5 pt-7 pb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1C4F4F] flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg leading-none">L</span>
            </div>
            <span className="font-bold text-[15px] tracking-tight" style={{ color: "var(--color-primary-ink)" }}>
              Layla
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 flex flex-col gap-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150",
                  isActive
                    ? "text-[#1C4F4F]"
                    : "hover:text-[var(--color-body)]"
                )}
                style={
                  isActive
                    ? { background: "var(--color-primary-light)" }
                    : { color: "var(--color-muted)" }
                }
              >
                <Icon size={17} style={{ color: isActive ? "#2A9D8F" : "var(--color-muted-soft)" }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-6 flex flex-col gap-0.5">
          <div className="h-px mb-3" style={{ background: "var(--color-hairline)" }} />
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150",
              pathname === "/settings" ? "text-[#1C4F4F]" : ""
            )}
            style={
              pathname === "/settings"
                ? { background: "var(--color-primary-light)" }
                : { color: "var(--color-muted)" }
            }
          >
            <Settings size={17} style={{ color: pathname === "/settings" ? "#2A9D8F" : "var(--color-muted-soft)" }} />
            Settings
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 w-full text-left"
            style={{ color: "var(--color-muted)" }}
          >
            {theme === "dark"
              ? <Sun size={17} style={{ color: "var(--color-muted-soft)" }} />
              : <Moon size={17} style={{ color: "var(--color-muted-soft)" }} />
            }
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 z-50 border-t"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-hairline)" }}
      >
        {navItems.map(({ href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center p-2.5 rounded-xl transition-colors"
              style={{ color: isActive ? "#2A9D8F" : "var(--color-muted-soft)" }}
            >
              <Icon size={22} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
