"use client";

import { ComingSoon } from "../ComingSoon";

export default function ToolsDatabasePage() {
  return (
    <ComingSoon
      title="AI Tools Database"
      subtitle="Direktori lengkap tools AI terbaik untuk setiap kebutuhan"
      icon="database"
      features={[
        "Katalog tools AI per kategori",
        "Filter berdasarkan harga & use-case",
        "Rating & review komunitas",
        "Bookmark tools favorit",
      ]}
    />
  );
}
