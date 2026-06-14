"use client";

import { useEffect, useState } from "react";

export type Palette = "sage" | "teal" | "orange" | "mono";

export const PALETTE_KEY = "ui-palette";

/** Metadata + representative swatch colors (literals) for each palette,
 *  used to render previews in Settings. The live theme is applied via the
 *  `data-palette` attribute on <html>, which swaps the CSS variables. */
export const PALETTES: {
  key: Palette;
  label: string;
  description: string;
  light: { primary: string; tint: string; surface: string; canvas: string; ink: string };
  dark: { primary: string; tint: string; surface: string; canvas: string; ink: string };
}[] = [
  {
    key: "sage",
    label: "Sage Green",
    description: "Soft & calm",
    light: { primary: "#4e7d2e", tint: "#cde5b7", surface: "#ffffff", canvas: "#f3f6f0", ink: "#1e2a18" },
    dark: { primary: "#9bd06b", tint: "#2c3d1e", surface: "#1a241a", canvas: "#141b13", ink: "#eef3ea" },
  },
  {
    key: "teal",
    label: "Teal",
    description: "Fresh & vivid",
    light: { primary: "#2a9d8f", tint: "#e6f4f2", surface: "#ffffff", canvas: "#f4f6f7", ink: "#1a2b32" },
    dark: { primary: "#4cc2b2", tint: "#0d2e2c", surface: "#1a2428", canvas: "#141b1e", ink: "#ecf2f4" },
  },
  {
    key: "orange",
    label: "Orange",
    description: "Warm & bold",
    light: { primary: "#ff6e00", tint: "#fff0e6", surface: "#ffffff", canvas: "#f8f6f3", ink: "#2a201a" },
    dark: { primary: "#ff8c3a", tint: "#2e1500", surface: "#221d18", canvas: "#1a1613", ink: "#f4efe9" },
  },
  {
    key: "mono",
    label: "Black & White",
    description: "Minimal & clean",
    light: { primary: "#1a1a1a", tint: "#ededed", surface: "#ffffff", canvas: "#f4f4f4", ink: "#0f0f0f" },
    dark: { primary: "#f0f0f0", tint: "#2a2a2a", surface: "#1b1b1b", canvas: "#121212", ink: "#f5f5f5" },
  },
];

export function usePalette() {
  const [palette, setPaletteState] = useState<Palette>("sage");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(PALETTE_KEY) as Palette | null;
      if (stored) setPaletteState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    try {
      localStorage.setItem(PALETTE_KEY, p);
      document.documentElement.setAttribute("data-palette", p);
    } catch {
      /* ignore */
    }
  };

  return { palette, setPalette, mounted };
}
