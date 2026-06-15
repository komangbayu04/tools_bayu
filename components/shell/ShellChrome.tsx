"use client";

import { Sidebar } from "./Sidebar";
import { PageTransition } from "./PageTransition";
import { FloatingChat } from "@/components/ai/FloatingChat";

/**
 * Persistent app chrome. Rendered ONCE at the root layout so the sidebar
 * never remounts on navigation — only the right-side content animates via
 * PageTransition. This prevents the sidebar from "blinking" on page change.
 */
export function ShellChrome({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-screen overflow-hidden md:pl-6 md:pt-4"
      style={{ background: "var(--color-global-bg)" }}
    >
      <Sidebar />
      <main
        className="flex-1 overflow-auto md:rounded-tl-[21px]"
        style={{
          background: "var(--color-surface)",
          boxShadow: "-6px 8px 42px 0px rgba(31,45,24,0.08)",
        }}
      >
        <div className="px-5 py-6 md:px-[52px] md:py-12 min-h-full">
          <div className="mx-auto w-full max-w-[1472px] pb-16 md:pb-0">
            <PageTransition>{children}</PageTransition>
        <FloatingChat />
          </div>
        </div>
      </main>
    </div>
  );
}
