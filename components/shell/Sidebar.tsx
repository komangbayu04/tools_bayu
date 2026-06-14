"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = { label: string; href: string; icon: IconName };
type NavGroup = { label: string; icon: IconName; children: NavItem[] };

const navItems: (NavItem | { group: NavGroup })[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Template Invoice", href: "/invoice", icon: "file-text" },
  {
    group: {
      label: "Workboard",
      icon: "check-square",
      children: [
        { label: "Todolist", href: "/todo", icon: "list-check" },
        { label: "Notepad", href: "/todo/notepad", icon: "edit" },
      ],
    },
  },
  { label: "Finance", href: "/finance", icon: "wallet" },
  { label: "Moodboard", href: "/moodboard", icon: "image" },
];

const STORAGE_KEY = "sidebar-collapsed";
const GROUP_STORAGE_KEY = "sidebar-groups-open";

let collapsedCache: boolean | null = null;
const readCollapsed = () => {
  if (collapsedCache !== null) return collapsedCache;
  if (typeof window !== "undefined") {
    collapsedCache = localStorage.getItem(STORAGE_KEY) === "true";
    return collapsedCache;
  }
  return false;
};

function ActiveHighlight() {
  return (
    <motion.span
      layoutId="sidebar-active"
      className="absolute inset-0 rounded-xl"
      style={{ background: "var(--color-primary-light)" }}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    />
  );
}

function isNavItem(item: (typeof navItems)[number]): item is NavItem {
  return "href" in item;
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem(GROUP_STORAGE_KEY) ?? "{}");
      } catch {
        return {};
      }
    }
    return {};
  });

  const toggle = (next: boolean) => {
    setCollapsed(next);
    collapsedCache = next;
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(next));
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      if (typeof window !== "undefined") localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const settingsActive = pathname === "/settings";

  const renderNavItem = (item: NavItem, indent = false) => {
    const isActive = pathname === item.href || (item.href !== "/todo" && pathname.startsWith(item.href + "/"));
    // Special case: /todo exact match or /todo/[projectId] (but not /todo/notepad)
    const todoActive = item.href === "/todo" && (pathname === "/todo" || (pathname.startsWith("/todo/") && pathname !== "/todo/notepad" && !pathname.startsWith("/todo/notepad/")));
    const active = item.href === "/todo" ? todoActive : isActive;

    return (
      <div key={item.href} className="relative group">
        <Link
          href={item.href}
          className={cn(
            "relative flex items-center gap-3 py-2 rounded-xl text-[13px] font-semibold",
            collapsed ? "justify-center px-0" : indent ? "pl-8 pr-3" : "px-3",
            active ? "text-[#7A2E00]" : "hover:text-[var(--color-body)]"
          )}
          style={active ? undefined : { color: "var(--color-muted)" }}
        >
          {active && <ActiveHighlight />}
          <Icon
            name={item.icon}
            size={15}
            className="relative z-10"
            style={{ flexShrink: 0, color: active ? "#FF6E00" : "var(--color-muted-soft)" }}
          />
          {!collapsed && <span className="relative z-10 whitespace-nowrap overflow-hidden">{item.label}</span>}
        </Link>
        {collapsed && (
          <div
            className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 z-50"
            style={{ background: "var(--color-ink)", color: "var(--color-canvas)", transition: "opacity 120ms" }}
          >
            {item.label}
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (group: NavGroup) => {
    const isAnyChildActive = group.children.some(
      (c) => c.href === "/todo"
        ? (pathname === "/todo" || (pathname.startsWith("/todo/") && pathname !== "/todo/notepad"))
        : pathname === c.href || pathname.startsWith(c.href + "/")
    );
    const isOpen = openGroups[group.label] !== false && (openGroups[group.label] === true || isAnyChildActive);

    return (
      <div key={group.label}>
        <div className="relative group">
          <button
            onClick={() => !collapsed && toggleGroup(group.label)}
            className={cn(
              "relative flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold w-full transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              isAnyChildActive ? "text-[#7A2E00]" : "hover:text-[var(--color-body)]"
            )}
            style={isAnyChildActive ? undefined : { color: "var(--color-muted)" }}
          >
            <Icon
              name={group.icon}
              size={17}
              className="relative z-10"
              style={{ flexShrink: 0, color: isAnyChildActive ? "#FF6E00" : "var(--color-muted-soft)" }}
            />
            {!collapsed && (
              <>
                <span className="relative z-10 flex-1 text-left whitespace-nowrap overflow-hidden">{group.label}</span>
                <Icon
                  name="chevron-down"
                  size={12}
                  className="relative z-10 transition-transform duration-200 flex-shrink-0"
                  style={{
                    color: "var(--color-muted-soft)",
                    transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                  }}
                />
              </>
            )}
          </button>
          {collapsed && (
            <div
              className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 z-50"
              style={{ background: "var(--color-ink)", color: "var(--color-canvas)", transition: "opacity 120ms" }}
            >
              {group.label}
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-0.5 pb-0.5">
                {group.children.map((child) => renderNavItem(child, true))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
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
            {collapsed ? (
              <button
                onClick={() => toggle(false)}
                className="group relative w-9 h-9 mx-auto rounded-xl bg-[#7A2E00] flex items-center justify-center shadow-sm flex-shrink-0"
                aria-label="Expand sidebar"
              >
                <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 group-hover:opacity-0">
                  <span className="text-white font-bold text-lg leading-none">B</span>
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <Icon name="chevron-right" size={16} className="text-white" />
                </span>
              </button>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-[#7A2E00] flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-white font-bold text-lg leading-none">B</span>
                </div>
                <span
                  className="font-bold text-[15px] tracking-tight whitespace-nowrap flex-1 min-w-0 overflow-hidden"
                  style={{ color: "var(--color-primary-ink)" }}
                >
                  Bayu
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
        <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item, i) =>
            isNavItem(item) ? renderNavItem(item) : renderGroup(item.group)
          )}
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-6 flex flex-col gap-0.5 flex-shrink-0">
          <div className="h-px mb-3 mx-1" style={{ background: "var(--color-hairline)" }} />

          {/* Settings */}
          <div className="relative group">
            <Link
              href="/settings"
              className={cn(
                "relative flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold",
                collapsed ? "justify-center px-0" : "px-3",
                settingsActive ? "text-[#7A2E00]" : ""
              )}
              style={settingsActive ? undefined : { color: "var(--color-muted)" }}
            >
              {settingsActive && <ActiveHighlight />}
              <Icon
                name="settings"
                size={17}
                className="relative z-10"
                style={{ flexShrink: 0, color: settingsActive ? "#FF6E00" : "var(--color-muted-soft)" }}
              />
              {!collapsed && <span className="relative z-10 whitespace-nowrap overflow-hidden">Settings</span>}
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
                <span className="whitespace-nowrap overflow-hidden">
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
        {[
          { href: "/dashboard", icon: "dashboard" as IconName },
          { href: "/invoice", icon: "file-text" as IconName },
          { href: "/todo", icon: "check-square" as IconName },
          { href: "/finance", icon: "wallet" as IconName },
          { href: "/moodboard", icon: "image" as IconName },
        ].map(({ href, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center p-2.5 rounded-xl transition-colors"
              style={{ color: isActive ? "#FF6E00" : "var(--color-muted-soft)" }}
            >
              <Icon name={icon} size={22} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
