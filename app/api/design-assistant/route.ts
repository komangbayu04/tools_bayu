import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type AnalysisMode = "critique" | "palette" | "consistency" | "layout";

const SYSTEM_PROMPTS: Record<AnalysisMode, string> = {
  critique: `Kamu adalah senior UI/UX designer yang memberikan critique desain yang jujur, konstruktif, dan actionable.
Analisis screenshot desain yang diberikan dan berikan critique terstruktur.

Gunakan format JSON berikut — balas HANYA dengan JSON valid, tanpa teks lain:
{
  "score": <number 1-10>,
  "summary": "<ringkasan singkat 1-2 kalimat>",
  "strengths": ["<kekuatan 1>", "<kekuatan 2>", ...],
  "issues": [
    {
      "severity": "high|medium|low",
      "area": "<area: Visual Hierarchy|Typography|Color|Spacing|CTA|Navigation|dll>",
      "issue": "<deskripsi masalah spesifik>",
      "fix": "<saran perbaikan konkret>"
    }
  ],
  "priority_action": "<satu hal paling penting yang harus diperbaiki sekarang>"
}`,

  palette: `Kamu adalah expert brand designer yang menganalisis palet warna, tipografi, dan visual identity.
Analisis screenshot desain dan identifikasi warna serta tipografi yang digunakan.

Balas HANYA dengan JSON valid:
{
  "colors": {
    "dominant": [{"hex": "#XXXXXX", "role": "<primary|background|text|accent|dll>", "note": "<catatan>"}],
    "harmony": "<analogous|complementary|triadic|monochromatic|split-complementary>",
    "harmony_score": <1-10>,
    "contrast_issues": ["<masalah kontras jika ada>"],
    "suggestions": ["<saran perbaikan atau penambahan warna>"]
  },
  "typography": {
    "fonts_detected": ["<font/style yang terlihat>"],
    "hierarchy_clear": <true|false>,
    "readability_score": <1-10>,
    "issues": ["<masalah tipografi>"],
    "suggestions": ["<saran tipografi>"]
  },
  "overall_brand_feel": "<deskripsi feel/mood brand secara keseluruhan>",
  "palette_recommendation": "<rekomendasi konkret untuk memperkuat brand palette>"
}`,

  consistency: `Kamu adalah QA designer yang mengecek konsistensi UI dan aksesibilitas desain.
Analisis screenshot untuk menemukan inkonsistensi visual dan masalah aksesibilitas.

Balas HANYA dengan JSON valid:
{
  "consistency_score": <1-10>,
  "accessibility_score": <1-10>,
  "consistency_issues": [
    {
      "type": "<Spacing|Border Radius|Color Usage|Icon Style|Button Style|Font Size|dll>",
      "description": "<deskripsi inkonsistensi spesifik>",
      "impact": "high|medium|low"
    }
  ],
  "accessibility_issues": [
    {
      "wcag": "<WCAG 1.1.1|1.4.3|2.1.1|dll>",
      "issue": "<deskripsi masalah aksesibilitas>",
      "fix": "<cara memperbaiki>"
    }
  ],
  "passed_checks": ["<hal-hal yang sudah baik dari sisi konsistensi/accessibility>"],
  "quick_wins": ["<perbaikan mudah yang berdampak besar>"]
}`,

  layout: `Kamu adalah layout expert dan information architect yang menganalisis struktur visual dan komposisi halaman.
Analisis screenshot untuk memberikan rekomendasi layout dan visual hierarchy.

Balas HANYA dengan JSON valid:
{
  "layout_type": "<Single column|Two column|Grid|Hero+Content|Dashboard|dll>",
  "visual_hierarchy_score": <1-10>,
  "layout_score": <1-10>,
  "grid_analysis": {
    "grid_detected": <true|false>,
    "alignment_issues": ["<masalah alignment>"],
    "whitespace_usage": "too tight|good|too loose"
  },
  "above_the_fold": {
    "cta_visible": <true|false>,
    "value_prop_clear": <true|false>,
    "clutter_level": "low|medium|high",
    "notes": "<catatan>"
  },
  "flow_issues": ["<masalah pada alur baca / eye flow>"],
  "layout_suggestions": [
    {
      "area": "<area spesifik>",
      "current": "<kondisi sekarang>",
      "suggestion": "<saran perubahan layout>",
      "impact": "high|medium|low"
    }
  ],
  "reference_patterns": ["<pola/pattern UI yang bisa ditiru untuk perbaikan>"]
}`,
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY belum dikonfigurasi di server." }, { status: 500 });
  }

  let body: { image: string; mediaType: string; mode: AnalysisMode };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body tidak valid." }, { status: 400 });
  }

  const { image, mediaType, mode } = body;
  if (!image || !mode || !SYSTEM_PROMPTS[mode]) {
    return Response.json({ error: "Parameter tidak lengkap." }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(mediaType)) {
    return Response.json({ error: "Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF." }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1800,
      system: SYSTEM_PROMPTS[mode],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: image,
              },
            },
            {
              type: "text",
              text: "Analisis desain ini dan berikan feedback sesuai instruksi.",
            },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    // Strip possible markdown code fences
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let result: unknown;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: "Claude mengembalikan format yang tidak valid.", raw }, { status: 502 });
    }

    return Response.json({ result, mode });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
