import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

const GRADIENTS = [
  "linear-gradient(135deg,#2A9D8F,#1C4F4F)",
  "linear-gradient(135deg,#6D8DF0,#3A4FC4)",
  "linear-gradient(135deg,#E8A55A,#C16A2E)",
  "linear-gradient(135deg,#C77DD6,#7C4D9E)",
  "linear-gradient(135deg,#5DB872,#2E7D4F)",
  "linear-gradient(135deg,#F0A07C,#D85A4A)",
  "linear-gradient(135deg,#8C7DE8,#5240A8)",
  "linear-gradient(135deg,#4DBFC4,#2A7E96)",
];

/** Resolve a stored `color` value to a CSS background. Supports gradients,
 *  hex colors, and (legacy) image URLs. Falls back to a deterministic gradient. */
export function resolveCover(color: string | undefined, seed: string): string {
  if (color) {
    if (color.startsWith("linear-gradient") || color.startsWith("#")) return color;
    if (color.startsWith("http")) return `url(${color}) center/cover no-repeat`;
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export function randomGradient(): string {
  return GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
}
