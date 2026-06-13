import { clsx } from "clsx";

type BadgeVariant =
  | "high"
  | "medium"
  | "low"
  | "done"
  | "teal"
  | "default"
  | "graphic"
  | "product"
  | "motion"
  | "3d";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  high: "bg-red-100 text-red-700 border border-red-200",
  medium: "bg-amber-100 text-amber-700 border border-amber-200",
  low: "bg-green-100 text-green-700 border border-green-200",
  done: "bg-gray-100 text-gray-500 border border-gray-200",
  teal: "bg-[#E0F0F0] text-[#1C4F4F] border border-[#B2DDD9]",
  default: "bg-[#F4F6F7] text-[#7A9099] border border-[#E5E9EB]",
  graphic: "bg-purple-100 text-purple-700 border border-purple-200",
  product: "bg-blue-100 text-blue-700 border border-blue-200",
  motion: "bg-orange-100 text-orange-700 border border-orange-200",
  "3d": "bg-pink-100 text-pink-700 border border-pink-200",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
