import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-[8px] px-3 py-2.5 text-sm outline-none transition-all resize-none",
        "border border-[var(--color-hairline)] bg-[var(--color-surface-card)] text-[var(--color-ink)] placeholder-[var(--color-muted-soft)]",
        "focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
