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

      const directive =
        mode === "combine"
          ? "Gabungkan kedua gambar menjadi satu komposisi yang menyatu dan natural — gambar pertama subjek utama, gambar kedua elemen/latar. Padukan pencahayaan, perspektif, dan warna."
          : mode === "texture"
            ? "Terapkan tekstur/material dari gambar kedua ke subjek pada gambar pertama, pertahankan bentuk dan siluet aslinya. Hasil realistis dan tajam."
            : "";
      const text = [directive, userPrompt].filter(Boolean).join("\n\n") || "Buat sebuah gambar.";

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

      const instruction =
        mode === "combine"
          ? "Gabungkan kedua gambar ini menjadi satu komposisi yang menyatu dan natural. " +
            "Gambar pertama adalah subjek/objek utama, gambar kedua adalah elemen atau latar yang ingin digabungkan. " +
            "Padukan pencahayaan, perspektif, dan warna agar terlihat seperti satu foto yang utuh."
          : "Gambar pertama adalah subjek utama (jaga bentuk, struktur, dan komposisinya). " +
            "Gambar kedua adalah REFERENSI TEKSTUR/MATERIAL. " +
            "Terapkan tekstur, material, pola permukaan, dan finishing dari gambar kedua ke subjek pada gambar pertama, " +
            "sambil mempertahankan siluet dan bentuk asli subjek. Hasilkan render yang realistis dan tajam.";

      const prompt = userPrompt ? `${instruction}\n\nCatatan tambahan: ${userPrompt}` : instruction;

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
