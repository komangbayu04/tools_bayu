import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 60;

const SYSTEM = `Kamu adalah asisten yang membantu Bayu menganalisa transcript meeting.
Nama user adalah BAYU — identifikasi semua bagian yang menyebut "Bayu", "saya" (kalau pembicara adalah Bayu), atau yang ditugaskan langsung ke Bayu.

Analisa transcript dan kembalikan JSON PERSIS seperti schema berikut (tanpa markdown, tanpa teks lain):
{
  "title": "judul ringkas meeting (maks 8 kata)",
  "summary": "ringkasan meeting 2-3 kalimat",
  "tasks": [
    {
      "title": "deskripsi tugas spesifik",
      "priority": "high|medium|low",
      "deadline": "2026-06-20",
      "notes": "konteks tambahan jika ada"
    }
  ],
  "watchPoints": [
    "hal yang perlu diperhatikan / dipantau oleh Bayu"
  ],
  "improvements": [
    "hal yang perlu diperbaiki atau ditingkatkan"
  ]
}

Aturan:
- "tasks" = pekerjaan yang HARUS dilakukan Bayu (action items)
- "watchPoints" = risiko, hal yang perlu dipantau, keputusan yang menggantung
- "improvements" = feedback, kritik, atau area yang perlu ditingkatkan
- "deadline" = isi HANYA jika disebutkan di transcript, format ISO "YYYY-MM-DD", boleh null/omit
- "priority" = "high" jika urgent/deadline dekat, "medium" jika normal, "low" jika opsional
- Jika tidak ada tasks/watchPoints/improvements, kembalikan array kosong
- Selalu kembalikan valid JSON`;

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 20) {
      return NextResponse.json({ error: "Transcript terlalu pendek atau kosong." }, { status: 400 });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Berikut transcript meeting:\n\n${transcript.trim()}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      title: parsed.title ?? "Meeting",
      summary: parsed.summary ?? "",
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      watchPoints: Array.isArray(parsed.watchPoints) ? parsed.watchPoints : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    });
  } catch (e) {
    console.error("[transcript] error:", e);
    return NextResponse.json({ error: "Gagal menganalisa transcript." }, { status: 500 });
  }
}
