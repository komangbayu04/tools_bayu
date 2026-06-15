import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Kamu adalah information architect dan UX strategist berpengalaman.
Tugasmu adalah membuat struktur sitemap website yang lengkap dan logis berdasarkan deskripsi bisnis/proyek yang diberikan.

Balas HANYA dengan JSON valid, tanpa teks lain:
{
  "name": "<nama website yang disarankan>",
  "pages": [
    {
      "name": "<nama halaman>",
      "sections": [
        {
          "name": "<nama section>",
          "description": "<deskripsi singkat isi section ini, 1 kalimat>"
        }
      ]
    }
  ],
  "rationale": "<1-2 kalimat alasan mengapa struktur ini dipilih>"
}

Panduan:
- Buat 4-8 halaman yang relevan dengan bisnis tersebut
- Tiap halaman punya 4-12 sections yang masuk akal
- Selalu mulai dengan Navbar dan akhiri dengan Footer di setiap halaman
- Section names singkat (1-3 kata), deskripsi informatif dan spesifik
- Sesuaikan dengan industri/niche yang dijelaskan user`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY belum dikonfigurasi di server." }, { status: 500 });
  }

  let body: { description: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body tidak valid." }, { status: 400 });
  }

  const { description } = body;
  if (!description?.trim()) {
    return Response.json({ error: "Deskripsi website tidak boleh kosong." }, { status: 400 });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Buatkan sitemap untuk website ini:\n\n${description.trim()}` },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    let result: unknown;
    try {
      result = JSON.parse(raw);
    } catch {
      return Response.json({ error: "GPT mengembalikan format yang tidak valid.", raw }, { status: 502 });
    }

    return Response.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
