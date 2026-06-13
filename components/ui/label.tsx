import { cn } from "@/lib/utils";
import { LabelHTMLAttributes } from "react";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-1.5", className)}
      {...props}
    />
  );
}
