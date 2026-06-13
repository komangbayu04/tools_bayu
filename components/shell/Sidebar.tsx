"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Image,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Template Invoice", href: "/invoice", icon: FileText },
  { label: "To do list", href: "/todo", icon: CheckSquare },
  { label: "Moodboard", href: "/moodboard", icon: Image },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[200px] flex-shrink-0 bg-[#F4F6F7] dark:bg-[#1A2428] h-screen flex-col sticky top-0">
        {/* Logo */}
        <div className="px-5 pt-7 pb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#1C4F4F] flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">L</span>
            </div>
            <span className="text-[#1C4F4F] dark:text-[#E8F0F2] font-bold text-base tracking-tight">
              Layla
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 flex flex-col gap-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-[#E0F0F0] dark:bg-[#0D2E2C] text-[#1C4F4F] dark:text-[#E8F0F2]"
                    : "text-[#7A9099] hover:bg-white dark:hover:bg-[#1E2B30] hover:text-[#3D5159] dark:hover:text-[#E8F0F2]"
                )}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-[#2A9D8F]" : "text-[#A8BDC3]"}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Settings + Dark mode toggle */}
        <div className="px-3 pb-6 flex flex-col gap-1">
          <Link
            href="/settings"
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              pathname === "/settings"
                ? "bg-[#E0F0F0] dark:bg-[#0D2E2C] text-[#1C4F4F] dark:text-[#E8F0F2]"
                : "text-[#7A9099] hover:bg-white dark:hover:bg-[#1E2B30] hover:text-[#3D5159] dark:hover:text-[#E8F0F2]"
            )}
          >
            <Settings
              size={18}
              className={
                pathname === "/settings" ? "text-[#2A9D8F]" : "text-[#A8BDC3]"
              }
            />
            Settings
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-[#7A9099] hover:bg-white dark:hover:bg-[#1E2B30] hover:text-[#3D5159] dark:hover:text-[#E8F0F2]"
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-[#A8BDC3]" />
            ) : (
              <Moon size={18} className="text-[#A8BDC3]" />
            )}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1E2B30] border-t border-[#E5E9EB] dark:border-[#2D3F47] flex items-center justify-around px-2 py-2 z-50">
        {navItems.map(({ href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center p-2 rounded-xl transition-colors",
                isActive ? "text-[#2A9D8F]" : "text-[#A8BDC3]"
              )}
            >
              <Icon size={22} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
