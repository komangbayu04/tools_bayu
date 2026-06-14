"use client";

import { motion } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Icon, type IconName } from "@/components/ui/icon";

export function ComingSoon({
  title,
  subtitle,
  icon,
  features,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  features: string[];
}) {
  return (
    <ShellLayout>
      <PageHeader eyebrow="AI Studio" title={title} subtitle={subtitle} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-[20px] border"
        style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
      >
        {/* glow */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-40"
          style={{ background: "var(--color-primary)" }}
        />
        <div className="relative px-8 py-12 sm:px-12 sm:py-16 flex flex-col items-center text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: "var(--color-primary-light)" }}
          >
            <Icon name={icon} size={34} style={{ color: "var(--color-primary-ink)" }} />
          </motion.div>

          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            <Icon name="sparkles" size={11} /> Coming Soon
          </span>

          <h2 className="text-[24px] font-bold tracking-tight max-w-md" style={{ color: "var(--color-ink)" }}>
            {title} sedang dikembangkan
          </h2>
          <p className="text-[14px] mt-2 max-w-md" style={{ color: "var(--color-muted)" }}>
            Fitur ini akan segera hadir. Berikut yang sedang kami siapkan:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-lg text-left">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-3"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}
              >
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-primary-light)" }}
                >
                  <Icon name="check" size={12} style={{ color: "var(--color-primary-ink)" }} />
                </span>
                <span className="text-[13px] font-medium" style={{ color: "var(--color-body)" }}>{f}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </ShellLayout>
  );
}
