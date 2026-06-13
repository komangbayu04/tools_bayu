"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Image,
  Settings,
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

  return (
    <aside className="w-[200px] flex-shrink-0 bg-[#F4F6F7] h-screen flex flex-col sticky top-0">
      {/* Logo */}
      <div className="px-5 pt-7 pb-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#1C4F4F] flex items-center justify-center">
            <span className="text-white font-bold text-lg leading-none">L</span>
          </div>
          <span className="text-[#1C4F4F] font-bold text-base tracking-tight">
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
                  ? "bg-[#E0F0F0] text-[#1C4F4F]"
                  : "text-[#7A9099] hover:bg-white hover:text-[#3D5159]"
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

      {/* Settings at bottom */}
      <div className="px-3 pb-6">
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            pathname === "/settings"
              ? "bg-[#E0F0F0] text-[#1C4F4F]"
              : "text-[#7A9099] hover:bg-white hover:text-[#3D5159]"
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
      </div>
    </aside>
  );
}
