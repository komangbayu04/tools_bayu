"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1 rounded-[11px] p-1 bg-[var(--color-canvas)]",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-150 outline-none",
      "text-[var(--color-muted)] hover:text-[var(--color-body)]",
      "data-[state=active]:bg-[var(--color-primary-light)] data-[state=active]:text-[#1C4F4F] data-[state=active]:shadow-[0_1px_2px_rgba(16,40,48,0.06)]",
      "dark:data-[state=active]:text-[#7FE0D2]",
      "focus-visible:ring-2 focus-visible:ring-[#2A9D8F]/30",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("outline-none focus-visible:ring-0", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
