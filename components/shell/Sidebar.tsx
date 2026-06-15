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
  {
    group: {
      label: "AI Studio",
      icon: "robot",
      children: [
        { label: "AI Tools Database", href: "/ai-studio/tools-database", icon: "database" },
        { label: "Prompt Library", href: "/ai-studio/prompts", icon: "file-text" },
        { label: "Creative Generator", href: "/ai-studio/creative", icon: "lightbulb" },
        { label: "Template Generator", href: "/ai-studio/templates", icon: "clone" },
        { label: "Design Assistant", href: "/ai-studio/design-assistant", icon: "pen-ruler" },
        { label: "AI Workflow Builder", href: "/ai-studio/workflows", icon: "workflow" },
        { label: "AI Experiments", href: "/ai-studio/experiments", icon: "flask" },
        { label: "AI Assets Library", href: "/ai-studio/assets", icon: "layers" },
      ],
    },
  },
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

// Is a /todo-style href active, treating /todo/notepad as a distinct route.
function hrefActive(pathname: string, href: string) {
  if (href === "/todo") {
    return pathname === "/todo" || (pathname.startsWith("/todo/") && !pathname.startsWith("/todo/notepad"));
  }
  return pathname === href || pathname.startsWith(href + "/");
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
    const active = hrefActive(pathname, item.href);
    return (
      <div key={item.href} className="relative group">
        <Link
          href={item.href}
          className={cn(
            "relative flex items-center gap-3 py-2 rounded-xl text-[13px] font-semibold",
            collapsed ? "justify-center px-0" : indent ? "pl-8 pr-3" : "px-3",
            active ? "" : "hover:text-[var(--color-body)]"
          )}
          style={active ? { color: "var(--color-primary-ink)" } : { color: "var(--color-muted)" }}
        >
          {active && <ActiveHighlight />}
          <Icon
            name={item.icon}
            size={15}
            className="relative z-10"
            style={{ flexShrink: 0, color: active ? "var(--color-primary)" : "var(--color-muted-soft)" }}
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
    const anyChildActive = group.children.some((c) => hrefActive(pathname, c.href));
    const isOpen = openGroups[group.label] === true || (openGroups[group.label] !== false && anyChildActive);

    return (
      <div key={group.label}>
        <div className="relative group">
          <button
            onClick={() => !collapsed && toggleGroup(group.label)}
            className={cn(
              "relative flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold w-full transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              anyChildActive ? "" : "hover:text-[var(--color-body)]"
            )}
            style={anyChildActive ? { color: "var(--color-primary-ink)" } : { color: "var(--color-muted)" }}
          >
            <Icon
              name={group.icon}
              size={17}
              className="relative z-10"
              style={{ flexShrink: 0, color: anyChildActive ? "var(--color-primary)" : "var(--color-muted-soft)" }}
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
            {/* Active dot on the collapsed parent icon */}
            {collapsed && anyChildActive && (
              <span
                className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--color-primary)" }}
              />
            )}
          </button>

          {/* Collapsed: hover flyout panel listing the sub-items */}
          {collapsed && (
            <div
              className="pointer-events-none absolute left-full top-0 ml-3 z-50 opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto"
              style={{ transition: "opacity 140ms ease, transform 140ms ease" }}
            >
              <div
                className="rounded-[14px] py-1.5 min-w-[160px]"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-hairline)",
                  boxShadow: "var(--shadow-pop)",
                }}
              >
                <p
                  className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-muted-soft)" }}
                >
                  {group.label}
                </p>
                {group.children.map((child) => {
                  const active = hrefActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="flex items-center gap-2.5 mx-1.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-colors hover:bg-[var(--color-canvas)]"
                      style={{ color: active ? "var(--color-primary-ink)" : "var(--color-body)" }}
                    >
                      <Icon
                        name={child.icon}
                        size={14}
                        style={{ flexShrink: 0, color: active ? "var(--color-primary)" : "var(--color-muted-soft)" }}
                      />
                      <span className="whitespace-nowrap">{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expanded: inline accordion of children */}
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
        className="hidden md:flex flex-shrink-0 h-screen flex-col overflow-visible"
        style={{
          width: collapsed ? "64px" : "200px",
          background: "var(--color-canvas)",
          transition: "width 250ms cubic-bezier(0.4,0,0.2,1)",
          marginRight: "4px",
        }}
      >
        {/* Logo + collapse toggle */}
        <div className="pt-4 pb-5 px-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {collapsed ? (
              <button
                onClick={() => toggle(false)}
                className="group relative w-9 h-9 mx-auto rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-sm flex-shrink-0"
                aria-label="Expand sidebar"
              >
                <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 group-hover:opacity-0">
                  <span className="text-[var(--color-on-primary)] font-bold text-lg leading-none">B</span>
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <Icon name="chevron-right" size={16} className="text-[var(--color-on-primary)]" />
                </span>
              </button>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-[var(--color-on-primary)] font-bold text-lg leading-none">B</span>
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
        <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-y-auto overflow-x-visible">
          {navItems.map((item) =>
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
                collapsed ? "justify-center px-0" : "px-3"
              )}
              style={settingsActive ? { color: "var(--color-primary-ink)" } : { color: "var(--color-muted)" }}
            >
              {settingsActive && <ActiveHighlight />}
              <Icon
                name="settings"
                size={17}
                className="relative z-10"
                style={{ flexShrink: 0, color: settingsActive ? "var(--color-primary)" : "var(--color-muted-soft)" }}
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
              style={{ color: isActive ? "var(--color-primary)" : "var(--color-muted-soft)" }}
            >
              <Icon name={icon} size={22} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
