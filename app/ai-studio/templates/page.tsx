"use client";

import { ComingSoon } from "../ComingSoon";

export default function TemplateGeneratorPage() {
  return (
    <ComingSoon
      title="Template Generator"
      subtitle="Buat template siap pakai untuk invoice, deck, dan dokumen"
      icon="clone"
      features={[
        "Generate template dari deskripsi",
        "Custom branding otomatis",
        "Library template tersimpan",
        "Ekspor ke Invoice & Moodboard",
      ]}
    />
  );
}
