import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 60;

const SYSTEM = `Kamu adalah analis meeting profesional yang membantu Bayu mendapat gambaran komprehensif dari sebuah rapat.

TUGAS: Analisa transcript meeting dengan sangat DETAIL dan MENDALAM. Nama user adalah BAYU.
Identifikasi semua bagian yang menyebut "Bayu", "saya" jika konteksnya Bayu yang bicara, atau yang ditugaskan langsung ke Bayu.

Kembalikan JSON PERSIS seperti schema berikut (tanpa markdown, tanpa teks lain):
{
  "title": "judul ringkas meeting (maks 8 kata)",
  "summary": "ringkasan komprehensif meeting 3-5 kalimat: apa yang dibahas, apa yang dicapai, dan kondisi umum",
  "moodScore": 75,
  "moodLabel": "Produktif & Positif",
  "moodReason": "1 kalimat penjelasan score — berdasarkan tone, antusiasme, ada/tidaknya konflik, kecepatan pembicaraan, pilihan kata peserta",
  "tasks": [
    {
      "title": "action item spesifik dan jelas — bukan umum",
      "priority": "high|medium|low",
      "deadline": "YYYY-MM-DD atau null",
      "notes": "konteks lengkap: kenapa task ini muncul, siapa yang minta, kondisi apa yang harus dipenuhi",
      "emphasis": "hal KRITIS yang tidak boleh terlewat: persyaratan spesifik klien, detail teknis penting, atau jebakan yang harus dihindari. null jika tidak ada"
    }
  ],
  "watchPoints": [
    "risiko spesifik, sinyal bahaya, hal yang gantung, atau situasi yang perlu dipantau — bukan generik"
  ],
  "improvements": [
    "feedback konkret yang diterima Bayu, area yang perlu ditingkatkan — bukan saran umum"
  ],
  "decisions": [
    "keputusan final yang disepakati dalam meeting — sesuatu yang sudah settled"
  ],
  "waitingOn": [
    "hal yang Bayu tunggu dari orang lain sebelum bisa lanjut — blocker spesifik"
  ],
  "openQuestions": [
    "pertanyaan atau isu yang belum terjawab / belum diputuskan dalam meeting"
  ],
  "initialQuestions": [
    "pertanyaan klarifikasi yang perlu diajukan ke Bayu untuk memastikan tidak ada task/detail yang terlewat — maks 3"
  ]
}

ATURAN KUALITAS:
- Tasks harus SPESIFIK dan ACTIONABLE — bukan "tindak lanjuti meeting"
- Jangan duplikasi antara tasks/watchPoints/decisions — tiap insight di satu tempat yang paling tepat
- moodScore: 0=konflik besar/meeting buruk, 50=netral, 100=sangat antusias/produktif. Analisa kata-kata emosional, keluhan, pujian, energi, interupsi, dll.
- "initialQuestions" = pertanyaan untuk sesi verifikasi dengan Bayu, bukan pertanyaan retoris
- Semua array boleh kosong jika memang tidak ada
- Kembalikan VALID JSON`;

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
      temperature: 0.15,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      title: parsed.title ?? "Meeting",
      summary: parsed.summary ?? "",
      moodScore: typeof parsed.moodScore === "number" ? Math.max(0, Math.min(100, parsed.moodScore)) : 50,
      moodLabel: parsed.moodLabel ?? "Netral",
      moodReason: parsed.moodReason ?? "",
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      watchPoints: Array.isArray(parsed.watchPoints) ? parsed.watchPoints : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      waitingOn: Array.isArray(parsed.waitingOn) ? parsed.waitingOn : [],
      openQuestions: Array.isArray(parsed.openQuestions) ? parsed.openQuestions : [],
      initialQuestions: Array.isArray(parsed.initialQuestions) ? parsed.initialQuestions : [],
    });
  } catch (e) {
    console.error("[transcript] error:", e);
    return NextResponse.json({ error: "Gagal menganalisa transcript." }, { status: 500 });
  }
}
