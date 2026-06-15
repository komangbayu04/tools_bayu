import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY belum dikonfigurasi." }, { status: 500 });
  }

  const body = await req.json() as {
    prompt: string;
    userInput: string;
    previousOutputs: { title: string; output: string }[];
  };

  const { prompt, userInput, previousOutputs } = body;

  // Build context string
  const contextParts: string[] = [];
  if (userInput?.trim()) {
    contextParts.push(`INPUT AWAL USER:\n${userInput}`);
  }
  if (previousOutputs?.length) {
    const prev = previousOutputs.map((p, i) => `Step ${i + 1} — ${p.title}:\n${p.output}`).join("\n\n");
    contextParts.push(`OUTPUT STEP SEBELUMNYA:\n${prev}`);
  }

  const systemPrompt = contextParts.length
    ? `Kamu adalah AI dalam sebuah workflow pipeline. Gunakan konteks berikut:\n\n${contextParts.join("\n\n")}\n\nEksekusi instruksi step berikutnya dengan presisi.`
    : "Kamu adalah AI dalam sebuah workflow pipeline. Eksekusi instruksi yang diberikan.";

  // Replace {{input}} in prompt with userInput
  const resolvedPrompt = prompt.replace(/\{\{input\}\}/gi, userInput || "");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: resolvedPrompt },
      ],
    });

    const output = response.choices[0]?.message?.content ?? "";
    return Response.json({ output });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
