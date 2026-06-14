import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-[var(--color-surface-card)] border border-[var(--color-hairline)] rounded-[8px] px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted-soft)] outline-none transition-all",
        "focus:ring-2 focus:ring-[#FF6E00]/25 focus:border-[#FF6E00]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
