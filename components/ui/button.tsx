"use client";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[10px] text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none select-none",
  {
    variants: {
      variant: {
        primary: "bg-[#2A9D8F] text-white hover:bg-[#1E7268] shadow-sm",
        secondary: "bg-[var(--color-surface-card)] text-[var(--color-body)] border border-[var(--color-hairline)] hover:bg-[var(--color-canvas)]",
        ghost: "text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-body)]",
        danger: "bg-[#C64545] text-white hover:bg-[#a83636]",
        outline: "border border-[var(--color-hairline)] text-[var(--color-body)] hover:bg-[var(--color-canvas)]",
      },
      size: {
        sm: "px-3 py-1.5 text-xs rounded-[8px]",
        md: "px-4 py-2.5",
        lg: "px-5 py-3 text-base",
        icon: "w-9 h-9 p-0 rounded-[10px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
