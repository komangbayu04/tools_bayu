import { cn } from "@/lib/utils";

const variants = {
  high: "bg-red-50 text-[#C64545] dark:bg-[#2d1a1a] dark:text-[#e88080]",
  medium: "bg-amber-50 text-[#9A6020] dark:bg-[#2d2210] dark:text-[#e8b870]",
  low: "bg-green-50 text-[#3D8B50] dark:bg-[#112811] dark:text-[#70c880]",
  teal: "bg-[var(--color-primary-light)] text-[var(--color-primary-ink)]",
  gray: "bg-[var(--color-canvas)] text-[var(--color-muted)]",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

interface BadgeProps {
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = "gray", className, children }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold", variants[variant], className)}>
      {children}
    </span>
  );
}
