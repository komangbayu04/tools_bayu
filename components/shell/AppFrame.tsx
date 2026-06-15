"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ShellChrome } from "@/components/shell/ShellChrome";

// Routes that are public (no auth, no app chrome) — e.g. client-facing
// invoice share links.
const PUBLIC_PREFIXES = ["/invoice/share"];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname?.startsWith(p));

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <ShellChrome>{children}</ShellChrome>
    </AuthProvider>
  );
}
