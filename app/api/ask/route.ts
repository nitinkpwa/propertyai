import { NextRequest } from "next/server";
import { AREA_IQ_SYSTEM_PROMPT } from "@/lib/ask/engine/prompts";
import { getOpenAIClient, OPENAI_MODEL } from "@/lib/ask/openai-client";

export async function POST(req: NextRequest) {
  try {
    const { messages, extraContext } = await req.json();
    const openai = getOpenAIClient();

    const systemContent = extraContext
      ? AREA_IQ_SYSTEM_PROMPT + extraContext
      : AREA_IQ_SYSTEM_PROMPT;

    const stream = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      stream: true,
      max_tokens: 1200,
      temperature: 0.7,
      messages: [{ role: "system", content: systemContent }, ...messages],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("OpenAI error:", error);
    return new Response(JSON.stringify({ error: "Failed" }), { status: 500 });
  }
}
