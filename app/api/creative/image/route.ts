import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Image generation can take a while — give the route room to breathe.
export const maxDuration = 120;

const ALLOWED_SIZES = ["1024x1024", "1024x1536", "1536x1024", "auto"];
const ALLOWED_QUALITY = ["low", "medium", "high", "auto"];

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY belum dikonfigurasi." }, { status: 500 });
  }

  const body = (await req.json()) as {
    prompt?: string;
    size?: string;
    quality?: string;
    n?: number;
  };

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return Response.json({ error: "Prompt tidak boleh kosong." }, { status: 400 });
  }

  const size = ALLOWED_SIZES.includes(body.size ?? "") ? body.size! : "1024x1024";
  const quality = ALLOWED_QUALITY.includes(body.quality ?? "") ? body.quality! : "medium";
  const n = Math.min(Math.max(body.n ?? 1, 1), 4);

  try {
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: size as "1024x1024" | "1024x1536" | "1536x1024" | "auto",
      quality: quality as "low" | "medium" | "high" | "auto",
      n,
    });

    const images = (result.data ?? [])
      .map((d) => (d.b64_json ? `data:image/png;base64,${d.b64_json}` : null))
      .filter((x): x is string => !!x);

    if (images.length === 0) {
      return Response.json({ error: "Model tidak mengembalikan gambar." }, { status: 502 });
    }

    return Response.json({ images, size, quality });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
