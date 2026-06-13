"use client";

import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, actions }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[13px] font-medium mb-1.5" style={{ color: "var(--color-muted)" }}>
            {eyebrow}
          </p>
        )}
        <h1
          className="text-[34px] sm:text-[40px] font-semibold tracking-tight leading-[1.1]"
          style={{ color: "var(--color-primary-ink)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[14px]" style={{ color: "var(--color-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-shrink-0">{actions}</div>}
    </motion.div>
  );
}
