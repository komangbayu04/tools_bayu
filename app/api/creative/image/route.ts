import OpenAI, { toFile } from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Image generation/editing can take a while — give the route room to breathe.
export const maxDuration = 180;

type Mode = "generate" | "combine" | "texture";

// Which models we accept, and what each one can do.
// `chat` models generate images via the Responses API image_generation tool.
const MODELS = {
  "gpt-5.5": { edit: true, chat: true },
  "gpt-image-1": { edit: true, chat: false },
  "gpt-image-1-mini": { edit: true, chat: false },
  "dall-e-3": { edit: false, chat: false },
  "dall-e-2": { edit: false, chat: false },
} as const;
type ModelId = keyof typeof MODELS;

// Convert a data URL (or raw base64) into a File the OpenAI SDK accepts.
async function dataUrlToFile(dataUrl: string, name: string) {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mimeMatch = /^data:([^;]+);/.exec(dataUrl);
  const type = mimeMatch?.[1] ?? "image/png";
  const buffer = Buffer.from(base64, "base64");
  return toFile(buffer, name, { type });
}

// Build a strict template prompt for the edit modes. The user's own prompt
// is treated as ADDITIONAL guidance only, to reduce AI hallucination.
function buildEditPrompt(mode: Mode, userPrompt: string): string {
  const template =
    mode === "combine"
      ? [
          "TUGAS: Gabungkan kedua gambar referensi menjadi SATU gambar yang menyatu secara fotografis dan realistis.",
          "- Gambar 1 = subjek/objek utama. Pertahankan identitas, bentuk, proporsi, warna, dan detail aslinya dengan akurat.",
          "- Gambar 2 = elemen atau latar yang ingin digabungkan.",
          "- Samakan arah pencahayaan, bayangan, perspektif, skala, dan suhu warna agar terlihat seperti satu foto nyata.",
          "ATURAN KETAT: Jangan menambah objek, orang, teks, logo, atau watermark yang tidak ada pada kedua gambar. Jangan mengarang detail yang tidak terlihat. Gunakan HANYA elemen yang benar-benar ada pada gambar referensi.",
        ].join("\n")
      : [
          "TUGAS: Transfer tekstur/material dari gambar referensi ke subjek secara realistis.",
          "- Gambar 1 = SUBJEK. Pertahankan bentuk, siluet, proporsi, sudut, dan komposisi PERSIS seperti aslinya. JANGAN mengubah bentuk objek.",
          "- Gambar 2 = REFERENSI TEKSTUR/MATERIAL. Ambil pola permukaan, jenis material, warna material, dan finishing-nya.",
          "- Terapkan tekstur dari gambar 2 ke permukaan subjek gambar 1 mengikuti kontur, lipatan, dan pencahayaan asli subjek.",
          "ATURAN KETAT: Jangan mengubah bentuk/siluet subjek. Jangan menambah objek, teks, atau latar baru. Jangan mengarang detail di luar kedua gambar.",
        ].join("\n");

  if (!userPrompt) return template;
  return (
    `${template}\n\n` +
    "ARAHAN TAMBAHAN DARI PENGGUNA (hanya pelengkap, tidak menggantikan tugas & aturan di atas):\n" +
    userPrompt
  );
}

// Pull base64 PNGs out of a Responses API result (image_generation tool).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromResponses(response: any): string[] {
  const out = (response?.output ?? []) as Array<{ type?: string; result?: string }>;
  return out
    .filter((o) => o.type === "image_generation_call" && o.result)
    .map((o) => `data:image/png;base64,${o.result}`);
}

// Normalize our 3 UI sizes to whatever a given model supports.
function normalizeSize(model: ModelId, size: string): string {
  if (model === "dall-e-3") {
    if (size === "1024x1536") return "1024x1792"; // portrait
    if (size === "1536x1024") return "1792x1024"; // landscape
    return "1024x1024";
  }
  if (model === "dall-e-2") return "1024x1024"; // square only
  // gpt-image-1 / mini accept our sizes as-is.
  return ["1024x1024", "1024x1536", "1536x1024", "auto"].includes(size) ? size : "1024x1024";
}

// Pull base64 PNGs out of an OpenAI image response.
function extractImages(data: { b64_json?: string }[] | undefined): string[] {
  return (data ?? [])
    .map((d) => (d.b64_json ? `data:image/png;base64,${d.b64_json}` : null))
    .filter((x): x is string => !!x);
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY belum dikonfigurasi." }, { status: 500 });
  }

  const body = (await req.json()) as {
    prompt?: string;
    size?: string;
    quality?: string;
    n?: number;
    mode?: Mode;
    model?: string;
    images?: string[]; // data URLs — required for combine/texture
  };

  const mode: Mode = body.mode ?? "generate";
  const userPrompt = body.prompt?.trim() ?? "";
  const model: ModelId = (body.model && body.model in MODELS ? body.model : "gpt-image-1") as ModelId;
  const size = normalizeSize(model, body.size ?? "1024x1024");

  // n: DALL·E 3 and the chat models return a single image; others cap at 4.
  const n = model === "dall-e-3" || MODELS[model].chat ? 1 : Math.min(Math.max(body.n ?? 1, 1), 4);
  const quality = ["low", "medium", "high", "auto"].includes(body.quality ?? "") ? body.quality! : "medium";

  try {
    let images: string[];

    // ── Chat models (GPT-5.5) → Responses API image_generation tool ──
    if (MODELS[model].chat) {
      const srcUrls = (body.images ?? []).filter(Boolean);
      if (mode !== "generate" && srcUrls.length < 2) {
        return Response.json({ error: "Perlu 2 gambar untuk mode ini." }, { status: 400 });
      }
      if (mode === "generate" && !userPrompt) {
        return Response.json({ error: "Prompt tidak boleh kosong." }, { status: 400 });
      }

      const text =
        mode === "generate"
          ? userPrompt || "Buat sebuah gambar."
          : buildEditPrompt(mode, userPrompt);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content: any[] = [{ type: "input_text", text }];
      if (mode !== "generate") {
        for (const url of srcUrls.slice(0, 2)) content.push({ type: "input_image", image_url: url });
      }

      const response = await client.responses.create({
        model,
        input: [{ role: "user", content }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ type: "image_generation", size, quality } as any],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      images = extractFromResponses(response);
      if (images.length === 0) {
        return Response.json({ error: "Model tidak mengembalikan gambar." }, { status: 502 });
      }
      return Response.json({ images, size, model });
    }

    if (mode === "generate") {
      if (!userPrompt) {
        return Response.json({ error: "Prompt tidak boleh kosong." }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = { model, prompt: userPrompt, size, n };

      if (model === "gpt-image-1" || model === "gpt-image-1-mini") {
        const q = ["low", "medium", "high", "auto"].includes(body.quality ?? "") ? body.quality! : "medium";
        params.quality = q;
        // gpt-image-1 always returns b64_json; no response_format needed.
      } else if (model === "dall-e-3") {
        params.quality = body.quality === "high" ? "hd" : "standard";
        params.response_format = "b64_json";
      } else {
        // dall-e-2 — no quality parameter.
        params.response_format = "b64_json";
      }

      const result = await client.images.generate(params);
      images = extractImages(result.data);
    } else {
      // ── Image-to-image: combine two photos, or transfer a texture ──
      if (!MODELS[model].edit) {
        return Response.json(
          { error: `Model ${model} tidak mendukung mode ini. Gunakan GPT Image.` },
          { status: 400 }
        );
      }

      const srcUrls = (body.images ?? []).filter(Boolean);
      if (srcUrls.length < 2) {
        return Response.json({ error: "Perlu 2 gambar untuk mode ini." }, { status: 400 });
      }

      const files = await Promise.all(
        srcUrls.slice(0, 2).map((url, i) => dataUrlToFile(url, `image-${i}.png`))
      );

      const prompt = buildEditPrompt(mode, userPrompt);

      const result = await client.images.edit({
        model,
        image: files,
        prompt,
        size: size as "1024x1024" | "1024x1536" | "1536x1024" | "auto",
        quality: quality as "low" | "medium" | "high" | "auto",
        n,
      });
      images = extractImages(result.data);
    }

    if (images.length === 0) {
      return Response.json({ error: "Model tidak mengembalikan gambar." }, { status: 502 });
    }

    return Response.json({ images, size, model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
