import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "w-full appearance-none rounded-[8px] pl-3 pr-9 py-2.5 text-sm outline-none transition-all cursor-pointer",
          "border border-[var(--color-hairline)] bg-[var(--color-surface-card)] text-[var(--color-ink)]",
          "focus:ring-2 focus:ring-[#FF6E00]/25 focus:border-[#FF6E00]",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: "var(--color-muted)" }}
      />
    </div>
  )
);
Select.displayName = "Select";
