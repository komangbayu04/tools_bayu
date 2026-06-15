import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TONES: Record<string, string> = {
  professional: "profesional, ringkas, dan meyakinkan",
  friendly: "hangat, ramah, dan personal namun tetap profesional",
  confident: "percaya diri, langsung ke poin, menonjolkan hasil",
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY belum dikonfigurasi." }, { status: 500 });
  }

  const body = (await req.json()) as {
    jobTitle: string;
    company?: string;
    jobDescription?: string;
    tone?: string;
    highlights?: string;
    language?: string;
  };

  const { jobTitle, company, jobDescription, tone = "professional", highlights, language = "Indonesian" } = body;

  const toneDesc = TONES[tone] ?? TONES.professional;

  const systemPrompt = `Kamu adalah asisten freelancer ahli yang menulis cover letter / proposal untuk melamar pekerjaan di platform seperti Upwork, Freelancer, dan job board remote.

Aturan:
- Tulis dalam bahasa ${language === "English" ? "Inggris" : "Indonesia"}.
- Tone: ${toneDesc}.
- Panjang ideal 120-200 kata. Jangan bertele-tele.
- Buka dengan kalimat yang langsung relevan ke kebutuhan klien (bukan "Halo nama saya...").
- Tunjukkan pemahaman atas masalah klien, lalu bagaimana kamu menyelesaikannya.
- Sisipkan 1-2 bukti/keahlian relevan.
- Tutup dengan call-to-action yang halus (ajakan diskusi/call).
- Output HANYA isi proposal dalam format markdown. Jangan tambahkan penjelasan apa pun.`;

  const userParts = [`Posisi yang dilamar: ${jobTitle}`];
  if (company) userParts.push(`Perusahaan/klien: ${company}`);
  if (jobDescription) userParts.push(`Deskripsi pekerjaan:\n${jobDescription}`);
  if (highlights?.trim()) userParts.push(`Keahlian/portfolio yang ingin saya tonjolkan:\n${highlights}`);

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 700,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userParts.join("\n\n") },
      ],
    });
    const proposal = response.choices[0]?.message?.content ?? "";
    return Response.json({ proposal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
