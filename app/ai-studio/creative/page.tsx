"use client";

import { ComingSoon } from "../ComingSoon";

export default function CreativeGeneratorPage() {
  return (
    <ComingSoon
      title="Creative Generator"
      subtitle="Hasilkan ide, konsep, dan konten kreatif secara instan"
      icon="lightbulb"
      features={[
        "Brainstorm ide dari satu kata kunci",
        "Generate moodboard otomatis",
        "Variasi konsep tak terbatas",
        "Ekspor langsung ke Moodboard",
      ]}
    />
  );
}
