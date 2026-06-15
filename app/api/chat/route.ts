import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const today = () => new Date().toISOString().split("T")[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);

const SYSTEM_PROMPT = `Kamu adalah asisten AI personal untuk dashboard produktivitas milik Bayu.
Kamu BISA dan HARUS langsung mengeksekusi aksi — bukan hanya mengarahkan user.
Jika user minta tambah pengeluaran, LANGSUNG tambahkan. Jika minta buat sitemap, LANGSUNG buat.
Setelah aksi selesai, konfirmasi apa yang sudah dilakukan dengan singkat dan ramah.

FITUR YANG TERSEDIA:
1. Finance — catat pengeluaran & pemasukan, lihat riwayat transaksi
2. Sitemap Generator — buat struktur website dengan halaman & sections
3. Design Assistant — analisis screenshot desain (butuh upload gambar)
4. Prompt Library — simpan koleksi prompt AI
5. Todo / Project — manajemen tugas
6. Invoice — buat dan kirim invoice
7. Moodboard — kumpulkan inspirasi visual
8. Documents — kontrak dan proposal

KATEGORI KEUANGAN YANG ADA:
- c1: Freelance (income)
- c2: Project Bonus (income)
- c3: Software & Tools (expense)
- c4: Food & Beverage (expense) — untuk makan/minum/jajan
- c5: Transport (expense)
- c6: Housing (expense)
- c7: Health (expense)
- c8: Entertainment (expense)

Tanggal hari ini: ${today()}
Bulan ini: ${thisMonth()}

PANDUAN:
- Kalau ada nominal uang dalam ribuan (mis. 50rb, 50k) → gunakan 50000
- Tebak kategori yang paling cocok dari konteks
- Balas singkat dan ramah dalam Bahasa Indonesia
- Setelah eksekusi, ceritakan apa yang sudah kamu lakukan (bukan instruksi)`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "add_transaction",
      description: "Tambahkan transaksi keuangan (pengeluaran atau pemasukan) ke finance tracker",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["income", "expense"], description: "Jenis transaksi" },
          amount: { type: "number", description: "Nominal dalam rupiah (contoh: 50000)" },
          description: { type: "string", description: "Deskripsi singkat transaksi" },
          categoryId: { type: "string", description: "ID kategori: c1-c8" },
          date: { type: "string", description: "Tanggal format YYYY-MM-DD, default hari ini" },
          note: { type: "string", description: "Catatan tambahan (opsional)" },
        },
        required: ["type", "amount", "description", "categoryId", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_sitemap",
      description: "Generate sitemap website lengkap dan langsung simpan ke Sitemap Generator",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Deskripsi bisnis/proyek" },
        },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Arahkan user ke halaman tertentu. Gunakan HANYA jika user memang ingin pergi ke halaman, bukan sebagai pengganti aksi.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" },
          reason: { type: "string" },
        },
        required: ["url", "reason"],
      },
    },
  },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

async function runSitemapGeneration(description: string) {
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Buat sitemap website. Balas HANYA JSON:
{"name":"<nama>","pages":[{"name":"<halaman>","sections":[{"name":"<section>","description":"<1 kalimat>"}]}]}
4-8 halaman, tiap halaman 4-12 sections, mulai Navbar, akhiri Footer.`,
      },
      { role: "user", content: description },
    ],
  });
  return JSON.parse(res.choices[0]?.message?.content ?? "{}") as {
    name: string;
    pages: { name: string; sections: { name: string; description: string }[] }[];
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY belum dikonfigurasi." }, { status: 500 });
  }

  let body: { messages: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request tidak valid." }, { status: 400 });
  }

  try {
    const first = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 600,
      tools,
      tool_choice: "auto",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...body.messages],
    });

    const choice = first.choices[0];

    // No tool call → plain reply
    if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
      return Response.json({ message: choice.message.content ?? "" });
    }

    const rawToolCall = choice.message.tool_calls[0];
    const fnName = (rawToolCall as { function: { name: string; arguments: string } }).function.name;
    const fnArgs = JSON.parse((rawToolCall as { function: { name: string; arguments: string } }).function.arguments) as Record<string, unknown>;

    // ── navigate ──────────────────────────────────────────────────
    if (fnName === "navigate") {
      const second = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 150,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...body.messages,
          choice.message,
          { role: "tool", tool_call_id: rawToolCall.id, content: JSON.stringify({ success: true }) },
        ],
      });
      return Response.json({
        message: second.choices[0].message.content ?? "",
        action: { type: "navigate", url: fnArgs.url as string },
      });
    }

    // ── add_transaction ───────────────────────────────────────────
    if (fnName === "add_transaction") {
      const tx = {
        type: fnArgs.type as "income" | "expense",
        amount: fnArgs.amount as number,
        description: fnArgs.description as string,
        categoryId: fnArgs.categoryId as string,
        date: (fnArgs.date as string) || today(),
        month: ((fnArgs.date as string) || today()).slice(0, 7),
        note: fnArgs.note as string | undefined,
      };

      const second = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 150,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...body.messages,
          choice.message,
          {
            role: "tool",
            tool_call_id: rawToolCall.id,
            content: JSON.stringify({ success: true, transaction: tx }),
          },
        ],
      });

      return Response.json({
        message: second.choices[0].message.content ?? "",
        action: { type: "add_transaction", transaction: tx },
      });
    }

    // ── generate_sitemap ──────────────────────────────────────────
    if (fnName === "generate_sitemap") {
      const sitemap = await runSitemapGeneration(fnArgs.description as string);

      const second = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 150,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...body.messages,
          choice.message,
          {
            role: "tool",
            tool_call_id: rawToolCall.id,
            content: JSON.stringify({ success: true, name: sitemap.name, pageCount: sitemap.pages.length }),
          },
        ],
      });

      return Response.json({
        message: second.choices[0].message.content ?? "",
        action: { type: "add_sitemap", sitemap },
      });
    }

    return Response.json({ message: "Hmm, ada yang tidak dikenali. Coba ulangi." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
