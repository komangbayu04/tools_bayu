import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 60;

const SYSTEM = `Kamu adalah asisten verifikasi meeting untuk Bayu. Tugasmu adalah membantu Bayu memastikan hasil analisa transcript meeting sudah lengkap dan akurat melalui percakapan singkat.

Konteks yang kamu punya:
1. Transcript asli meeting
2. Hasil analisa awal (tasks, watchPoints, decisions, dll)
3. Riwayat percakapan dengan Bayu

Caramu bekerja:
- Tanya hal yang belum jelas atau mungkin terlewat SATU PER SATU — jangan semua sekaligus
- Kalau Bayu konfirmasi sebuah task baru atau detailnya, akui dan catat
- Kalau Bayu bilang ada yang salah, koreksi dengan ramah
- Kalau Bayu ingin tambah task/catatan, sambut dan konfirmasi apa yang ditambahkan
- Setelah semua hal terklarifikasi, tanya apakah Bayu siap menyimpan session ini
- Gunakan bahasa Indonesia yang santai tapi profesional — seperti kolega yang membantu

Format respons: teks biasa, BUKAN JSON. Singkat, padat, fokus.
Jangan ulangi seluruh analisa — fokus pada dialog untuk klarifikasi dan tambahan.`;

export async function POST(req: NextRequest) {
  try {
    const { transcript, analysis, messages, userMessage } = await req.json();

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "Pesan tidak valid." }, { status: 400 });
    }

    const contextBlock = `
TRANSCRIPT ASLI:
${transcript}

HASIL ANALISA SAAT INI:
- Tasks (${analysis.tasks?.length ?? 0}): ${(analysis.tasks ?? []).map((t: { title: string }) => t.title).join(", ") || "tidak ada"}
- Decisions: ${(analysis.decisions ?? []).join(", ") || "tidak ada"}
- WaitingOn: ${(analysis.waitingOn ?? []).join(", ") || "tidak ada"}
- OpenQuestions: ${(analysis.openQuestions ?? []).join(", ") || "tidak ada"}
- WatchPoints (${analysis.watchPoints?.length ?? 0}): ${(analysis.watchPoints ?? []).join(", ") || "tidak ada"}
- Improvements: ${(analysis.improvements ?? []).join(", ") || "tidak ada"}
`;

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM + "\n\n" + contextBlock },
      ...(messages ?? []).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: chatMessages,
      temperature: 0.4,
      max_tokens: 400,
    });

    const reply = completion.choices[0]?.message?.content ?? "Maaf, ada masalah saat merespons.";
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[transcript/chat] error:", e);
    return NextResponse.json({ error: "Gagal mengirim pesan." }, { status: 500 });
  }
}
