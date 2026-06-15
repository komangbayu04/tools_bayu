import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Kamu adalah asisten AI personal untuk dashboard produktivitas milik Bayu.
Kamu bisa membantu membuat, mengelola, dan menavigasi semua fitur yang ada di dashboard ini.

FITUR YANG TERSEDIA:
1. **Sitemap Generator** (/ai-studio/creative/sitemap) — buat struktur website lengkap dengan halaman & sections
2. **Design Assistant** (/ai-studio/design-assistant) — analisis screenshot desain (UI critique, palet warna, konsistensi, layout)
3. **Prompt Library** (/ai-studio/prompts) — simpan dan kelola koleksi prompt AI
4. **Workflow Builder** (/ai-studio/workflows) — buat alur kerja AI multi-step
5. **Moodboard** (/moodboard) — kumpulkan inspirasi visual
6. **Finance** (/finance) — kelola keuangan dan evaluasi proyek
7. **Invoice** (/invoice) — buat dan kirim invoice
8. **Todo / Project** (/todo) — manajemen tugas dan proyek
9. **Documents** (/documents) — kontrak dan proposal

CARA BERTINDAK:
- Jika diminta buat sitemap → gunakan tool generate_sitemap
- Jika diminta navigasi/buka halaman → gunakan tool navigate
- Jika diminta analisis desain → gunakan tool navigate ke /ai-studio/design-assistant
- Untuk pertanyaan umum → jawab langsung dengan ramah dan singkat
- Balas dalam Bahasa Indonesia kecuali user memakai bahasa lain
- Jangan terlalu panjang, to the point dan helpful`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "generate_sitemap",
      description: "Generate sitemap website lengkap berdasarkan deskripsi bisnis/proyek. Hasilnya langsung ditambahkan ke Sitemap Generator.",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Deskripsi lengkap tentang website/bisnis yang ingin dibuatkan sitemap-nya",
          },
        },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Arahkan user ke halaman tertentu di dashboard",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL halaman tujuan (contoh: /ai-studio/design-assistant)",
          },
          reason: {
            type: "string",
            description: "Alasan singkat kenapa navigasi ke halaman ini",
          },
        },
        required: ["url", "reason"],
      },
    },
  },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

async function runSitemapGeneration(description: string) {
  const sitemapPrompt = `Kamu adalah information architect. Buat sitemap website berdasarkan deskripsi ini.
Balas HANYA dengan JSON valid:
{
  "name": "<nama website>",
  "pages": [
    {
      "name": "<nama halaman>",
      "sections": [
        { "name": "<nama section>", "description": "<deskripsi 1 kalimat>" }
      ]
    }
  ]
}
Buat 4-8 halaman, tiap halaman 4-12 sections. Mulai dengan Navbar, akhiri dengan Footer.`;

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sitemapPrompt },
      { role: "user", content: description },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as { name: string; pages: { name: string; sections: { name: string; description: string }[] }[] };
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

  const { messages } = body;

  try {
    // First call — let GPT decide if it needs a tool
    const first = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      tools,
      tool_choice: "auto",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
    });

    const choice = first.choices[0];

    // No tool call → plain text reply
    if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
      return Response.json({ message: choice.message.content ?? "" });
    }

    // Handle tool calls
    const toolCall = choice.message.tool_calls[0] as OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { function: { name: string; arguments: string } };
    const fnName = toolCall.function.name;
    const fnArgs = JSON.parse(toolCall.function.arguments) as Record<string, string>;

    if (fnName === "navigate") {
      // Second call to get natural language reply
      const second = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
          choice.message,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ success: true }),
          },
        ],
      });
      return Response.json({
        message: second.choices[0].message.content ?? "",
        action: { type: "navigate", url: fnArgs.url as string },
      });
    }

    if (fnName === "generate_sitemap") {
      const sitemap = await runSitemapGeneration(fnArgs.description as string);

      const second = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
          choice.message,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ success: true, name: sitemap.name, pageCount: sitemap.pages.length }),
          },
        ],
      });

      return Response.json({
        message: second.choices[0].message.content ?? "",
        action: { type: "add_sitemap", sitemap },
      });
    }

    return Response.json({ message: "Tool tidak dikenali." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
