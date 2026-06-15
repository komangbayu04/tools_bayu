import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 120;

const ALLOWED_MODELS = ["sora-2", "sora-2-pro"];
const ALLOWED_SECONDS = ["4", "8", "12"];
const ALLOWED_SIZES = ["720x1280", "1280x720", "1024x1792", "1792x1024"];

// POST → start a video generation job, returns { videoId, status }
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY belum dikonfigurasi." }, { status: 500 });
  }

  const body = (await req.json()) as {
    prompt?: string;
    model?: string;
    seconds?: string;
    size?: string;
  };

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return Response.json({ error: "Prompt tidak boleh kosong." }, { status: 400 });
  }

  const model = ALLOWED_MODELS.includes(body.model ?? "") ? body.model! : "sora-2";
  const seconds = ALLOWED_SECONDS.includes(body.seconds ?? "") ? body.seconds! : "4";
  const size = ALLOWED_SIZES.includes(body.size ?? "") ? body.size! : "1280x720";

  try {
    const job = await client.videos.create({
      model: model as "sora-2" | "sora-2-pro",
      prompt,
      seconds: seconds as "4" | "8" | "12",
      size: size as "720x1280" | "1280x720" | "1024x1792" | "1792x1024",
    });
    return Response.json({ videoId: job.id, status: job.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

// GET ?id= → poll job status; when completed, return the video as a data URL
export async function GET(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY belum dikonfigurasi." }, { status: 500 });
  }

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return Response.json({ error: "Parameter id wajib." }, { status: 400 });
  }

  try {
    const job = await client.videos.retrieve(id);

    if (job.status !== "completed") {
      return Response.json({
        status: job.status,
        progress: (job as { progress?: number }).progress ?? null,
        error: job.error?.message ?? null,
      });
    }

    // Completed → download the rendered MP4 and inline it as base64.
    const content = await client.videos.downloadContent(id, { variant: "video" });
    const buf = Buffer.from(await content.arrayBuffer());
    const dataUrl = `data:video/mp4;base64,${buf.toString("base64")}`;
    return Response.json({ status: "completed", dataUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
