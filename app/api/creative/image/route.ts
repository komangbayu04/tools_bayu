import OpenAI, { toFile } from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Image generation/editing can take a while — give the route room to breathe.
export const maxDuration = 180;

const ALLOWED_SIZES = ["1024x1024", "1024x1536", "1536x1024", "auto"];
const ALLOWED_QUALITY = ["low", "medium", "high", "auto"];

type Mode = "generate" | "combine" | "texture";

// Convert a data URL (or raw base64) into a File the OpenAI SDK accepts.
async function dataUrlToFile(dataUrl: string, name: string) {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mimeMatch = /^data:([^;]+);/.exec(dataUrl);
  const type = mimeMatch?.[1] ?? "image/png";
  const buffer = Buffer.from(base64, "base64");
  return toFile(buffer, name, { type });
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
    images?: string[]; // data URLs — required for combine/texture
  };

  const mode: Mode = body.mode ?? "generate";
  const userPrompt = body.prompt?.trim() ?? "";

  const size = ALLOWED_SIZES.includes(body.size ?? "") ? body.size! : "1024x1024";
  const quality = ALLOWED_QUALITY.includes(body.quality ?? "") ? body.quality! : "medium";
  const n = Math.min(Math.max(body.n ?? 1, 1), 4);

  try {
    let images: string[];

    if (mode === "generate") {
      if (!userPrompt) {
        return Response.json({ error: "Prompt tidak boleh kosong." }, { status: 400 });
      }
      const result = await client.images.generate({
        model: "gpt-image-1",
        prompt: userPrompt,
        size: size as "1024x1024" | "1024x1536" | "1536x1024" | "auto",
        quality: quality as "low" | "medium" | "high" | "auto",
        n,
      });
      images = (result.data ?? [])
        .map((d) => (d.b64_json ? `data:image/png;base64,${d.b64_json}` : null))
        .filter((x): x is string => !!x);
    } else {
      // ── Image-to-image: combine two photos, or transfer a texture ──
      const srcUrls = (body.images ?? []).filter(Boolean);
      if (srcUrls.length < 2) {
        return Response.json({ error: "Perlu 2 gambar untuk mode ini." }, { status: 400 });
      }

      const files = await Promise.all(
        srcUrls.slice(0, 2).map((url, i) => dataUrlToFile(url, `image-${i}.png`))
      );

      // Build a guiding instruction per mode, then append the user's notes.
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
        model: "gpt-image-1",
        image: files,
        prompt,
        size: size as "1024x1024" | "1024x1536" | "1536x1024" | "auto",
        quality: quality as "low" | "medium" | "high" | "auto",
        n,
      });
      images = (result.data ?? [])
        .map((d) => (d.b64_json ? `data:image/png;base64,${d.b64_json}` : null))
        .filter((x): x is string => !!x);
    }

    if (images.length === 0) {
      return Response.json({ error: "Model tidak mengembalikan gambar." }, { status: 502 });
    }

    return Response.json({ images, size, quality });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
