"use client";

import { ComingSoon } from "../ComingSoon";

export default function DesignAssistantPage() {
  return (
    <ComingSoon
      title="Design Assistant"
      subtitle="Asisten desain pintar untuk feedback & rekomendasi real-time"
      icon="pen-ruler"
      features={[
        "Critique desain otomatis",
        "Saran palet warna & tipografi",
        "Cek konsistensi & accessibility",
        "Rekomendasi layout",
      ]}
    />
  );
}
