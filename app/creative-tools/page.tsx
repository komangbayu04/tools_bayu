"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShellLayout } from "@/components/shell/Layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { Icon, type IconName } from "@/components/ui/icon";

type Tool = {
  title: string;
  description: string;
  icon: IconName;
  href: string;
  badge?: string;
};

const tools: Tool[] = [
  {
    title: "Image Generator",
    description: "Hasilkan gambar, ilustrasi, atau aset visual dari teks dengan AI (gpt-image-1).",
    icon: "image",
    href: "/creative-tools/image",
    badge: "AI",
  },
  {
    title: "Video Generator",
    description: "Buat klip video pendek dari deskripsi teks menggunakan model Sora.",
    icon: "film",
    href: "/creative-tools/video",
    badge: "AI",
  },
  {
    title: "Motion Editor",
    description: "Editor micro-interaction ala Jitter — animasikan teks & shape, lalu ekspor ke video WebM.",
    icon: "shapes",
    href: "/creative-tools/motion",
    badge: "Baru",
  },
];

export default function CreativeToolsPage() {
  return (
    <ShellLayout>
      <PageHeader
        eyebrow="Creative Tools"
        title="Creative Tools"
        subtitle="Generate gambar, video, dan micro-interaction — semua di satu tempat."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool, i) => (
          <Link key={tool.title} href={tool.href} className="block h-full">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="group relative h-full overflow-hidden rounded-[18px] border p-5 flex flex-col"
              style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-card)" }}
            >
              <div
                className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity"
                style={{ background: "var(--color-primary)" }}
              />

              <div className="relative flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "var(--color-primary-light)" }}
                >
                  <Icon name={tool.icon} size={22} style={{ color: "var(--color-primary-ink)" }} />
                </div>
                {tool.badge && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
                  >
                    {tool.badge}
                  </span>
                )}
              </div>

              <h3 className="relative text-[16px] font-bold tracking-tight mb-1.5" style={{ color: "var(--color-ink)" }}>
                {tool.title}
              </h3>
              <p className="relative text-[13px] leading-relaxed flex-1" style={{ color: "var(--color-muted)" }}>
                {tool.description}
              </p>

              <div
                className="relative mt-4 flex items-center gap-1.5 text-[13px] font-semibold"
                style={{ color: "var(--color-primary-ink)" }}
              >
                Buka tool
                <Icon name="arrow-right" size={13} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </ShellLayout>
  );
}
