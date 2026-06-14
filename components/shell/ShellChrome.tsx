"use client";

import { Sidebar } from "./Sidebar";
import { PageTransition } from "./PageTransition";

/**
 * Persistent app chrome. Rendered ONCE at the root layout so the sidebar
 * never remounts on navigation — only the right-side content animates via
 * PageTransition. This prevents the sidebar from "blinking" on page change.
 */
export function ShellChrome({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--color-global-bg)", paddingLeft: 24, paddingTop: 16 }}
    >
      <Sidebar />
      <main
        className="flex-1 overflow-auto"
        style={{
          background: "var(--color-surface)",
          borderTopLeftRadius: 21,
          boxShadow: "-6px 8px 42px 0px rgba(31,45,24,0.08)",
        }}
      >
        <div className="px-6 py-8 md:px-[52px] md:py-12 min-h-full">
          <div className="mx-auto w-full max-w-[1472px] pb-16 md:pb-0">
            <PageTransition>{children}</PageTransition>
          </div>
        </div>
      </main>
    </div>
  );
}
