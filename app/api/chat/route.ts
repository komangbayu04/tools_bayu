import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const today = () => new Date().toISOString().split("T")[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);

const SYSTEM_PROMPT = `Kamu adalah asisten AI personal untuk dashboard produktivitas milik Bayu.
Kamu BISA dan HARUS langsung mengeksekusi aksi di semua fitur — bukan hanya mengarahkan user.
Begitu user minta sesuatu, panggil tool yang sesuai dan langsung kerjakan.
Setelah aksi selesai, konfirmasi singkat & ramah apa yang sudah dilakukan (jangan kasih instruksi manual).

SEMUA FITUR & TOOL YANG BISA KAMU EKSEKUSI:
1. Finance → add_transaction (catat pemasukan/pengeluaran)
2. Sitemap Generator → generate_sitemap (buat struktur website)
3. Todo/Task → create_task (buat tugas), create_project (buat proyek)
4. Invoice → create_invoice (buat draft invoice/quotation)
5. Moodboard → add_moodboard (simpan inspirasi visual)
6. Prompt Library → save_prompt (simpan prompt)
7. Workflow Runner → create_workflow (buat pipeline AI multi-step)
8. AI Assets → add_asset (simpan aset AI)
9. navigate → arahkan user ke halaman tertentu (hanya jika user memang ingin pindah halaman)

KATEGORI KEUANGAN:
c1 Freelance(income), c2 Project Bonus(income), c3 Software & Tools, c4 Food & Beverage(makan/jajan),
c5 Transport, c6 Housing, c7 Health, c8 Entertainment.

Tanggal hari ini: ${today()} | Bulan ini: ${thisMonth()}

PANDUAN:
- Nominal "50rb"/"50k" = 50000, "2jt" = 2000000.
- Tebak nilai default yang masuk akal bila user tidak menyebut detail (mis. prioritas task = medium, warna proyek = hijau).
- Untuk create_workflow, buat 2-4 step dengan prompt yang jelas, gunakan {{input}} bila perlu.
- Balas dalam Bahasa Indonesia, singkat, ramah.`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "add_transaction",
      description: "Catat transaksi keuangan (pemasukan/pengeluaran)",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["income", "expense"] },
          amount: { type: "number", description: "Nominal rupiah, contoh 50000" },
          description: { type: "string" },
          categoryId: { type: "string", description: "ID kategori c1-c8" },
          date: { type: "string", description: "YYYY-MM-DD, default hari ini" },
          note: { type: "string" },
        },
        required: ["type", "amount", "description", "categoryId", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_sitemap",
      description: "Generate sitemap website lengkap dan simpan ke Sitemap Generator",
      parameters: {
        type: "object",
        properties: { description: { type: "string", description: "Deskripsi bisnis/proyek" } },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Buat tugas/task baru di Todo",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          deadline: { type: "string", description: "YYYY-MM-DD opsional" },
          projectName: { type: "string", description: "Nama proyek tempat task ini, opsional" },
        },
        required: ["title", "priority"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Buat proyek baru",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          client: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["active", "completed", "paused"] },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Buat draft invoice atau quotation",
      parameters: {
        type: "object",
        properties: {
          docType: { type: "string", enum: ["invoice", "quotation"] },
          clientName: { type: "string" },
          total: { type: "number", description: "Total nominal rupiah" },
          dateIssued: { type: "string", description: "YYYY-MM-DD, default hari ini" },
          dueDate: { type: "string", description: "YYYY-MM-DD opsional" },
          note: { type: "string", description: "Deskripsi item/pekerjaan" },
        },
        required: ["docType", "clientName", "total"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_moodboard",
      description: "Simpan item inspirasi ke Moodboard",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string", description: "URL sumber/referensi, opsional" },
          note: { type: "string" },
          category: { type: "string", enum: ["graphic_design", "product_design", "3d", "motion"] },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_prompt",
      description: "Simpan prompt ke Prompt Library",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string", description: "Isi prompt" },
          category: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_workflow",
      description: "Buat workflow AI multi-step di Workflow Runner",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                prompt: { type: "string", description: "Instruksi AI, boleh pakai {{input}}" },
                note: { type: "string" },
              },
              required: ["title", "prompt"],
            },
          },
        },
        required: ["name", "steps"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_asset",
      description: "Simpan aset AI (gambar/video/teks/audio) ke AI Assets",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          type: { type: "string", enum: ["image", "video", "text", "audio"] },
          prompt: { type: "string" },
          model: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Arahkan user ke halaman tertentu (hanya bila user ingin pindah halaman)",
      parameters: {
        type: "object",
        properties: { url: { type: "string" }, reason: { type: "string" } },
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

// Map a tool call into a client-executable action payload.
async function buildAction(fnName: string, args: Record<string, unknown>) {
  switch (fnName) {
    case "navigate":
      return { type: "navigate", url: args.url as string };

    case "add_transaction": {
      const date = (args.date as string) || today();
      return {
        type: "add_transaction",
        transaction: {
          type: args.type as "income" | "expense",
          amount: args.amount as number,
          description: args.description as string,
          categoryId: args.categoryId as string,
          date,
          month: date.slice(0, 7),
          note: args.note as string | undefined,
        },
      };
    }

    case "generate_sitemap": {
      const sitemap = await runSitemapGeneration(args.description as string);
      return { type: "add_sitemap", sitemap };
    }

    case "create_task":
      return {
        type: "create_task",
        task: {
          title: args.title as string,
          description: args.description as string | undefined,
          priority: (args.priority as string) || "medium",
          deadline: args.deadline as string | undefined,
          projectName: args.projectName as string | undefined,
        },
      };

    case "create_project":
      return {
        type: "create_project",
        project: {
          name: args.name as string,
          client: (args.client as string) || "",
          description: args.description as string | undefined,
          status: (args.status as string) || "active",
        },
      };

    case "create_invoice": {
      const dateIssued = (args.dateIssued as string) || today();
      return {
        type: "create_invoice",
        invoice: {
          docType: (args.docType as string) || "invoice",
          clientName: args.clientName as string,
          total: args.total as number,
          dateIssued,
          dueDate: args.dueDate as string | undefined,
          note: args.note as string | undefined,
        },
      };
    }

    case "add_moodboard":
      return {
        type: "add_moodboard",
        item: {
          title: args.title as string,
          url: (args.url as string) || "",
          note: args.note as string | undefined,
          category: (args.category as string) || "graphic_design",
          tags: (args.tags as string[]) || [],
        },
      };

    case "save_prompt":
      return {
        type: "save_prompt",
        prompt: {
          title: args.title as string,
          content: args.content as string,
          category: (args.category as string) || "Umum",
          tags: (args.tags as string[]) || [],
        },
      };

    case "create_workflow":
      return {
        type: "create_workflow",
        workflow: {
          name: args.name as string,
          description: (args.description as string) || "",
          steps: (args.steps as { title: string; prompt: string; note?: string }[]) || [],
        },
      };

    case "add_asset":
      return {
        type: "add_asset",
        asset: {
          title: args.title as string,
          url: (args.url as string) || "",
          type: (args.type as string) || "image",
          prompt: (args.prompt as string) || "",
          model: (args.model as string) || "",
          tags: (args.tags as string[]) || [],
        },
      };

    default:
      return null;
  }
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
      max_tokens: 800,
      tools,
      tool_choice: "auto",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...body.messages],
    });

    const choice = first.choices[0];

    if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
      return Response.json({ message: choice.message.content ?? "" });
    }

    const rawToolCall = choice.message.tool_calls[0] as {
      id: string;
      function: { name: string; arguments: string };
    };
    const fnName = rawToolCall.function.name;
    const fnArgs = JSON.parse(rawToolCall.function.arguments || "{}") as Record<string, unknown>;

    const action = await buildAction(fnName, fnArgs);
    if (!action) {
      return Response.json({ message: "Hmm, ada yang tidak dikenali. Coba ulangi." });
    }

    // Friendly confirmation via a follow-up completion.
    const second = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 180,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...body.messages,
        choice.message,
        { role: "tool", tool_call_id: rawToolCall.id, content: JSON.stringify({ success: true, ...action }) },
      ],
    });

    return Response.json({
      message: second.choices[0].message.content ?? "",
      action,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
