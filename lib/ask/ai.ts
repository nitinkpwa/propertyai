/**
 * Client-side streaming helper for the legacy SSE endpoint POST /api/ask.
 * The Ask page uses POST /api/ask/query (structured engine) instead.
 * This module remains for any streaming UI that calls /api/ask directly.
 */
export async function streamAskAI(
  userQuery: string,
  extraContext?: string,
): Promise<string> {
  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: userQuery }],
        extraContext: extraContext ?? "",
      }),
    });

    if (!response.ok || !response.body) {
      return "";
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) content += delta;
        } catch {
          // skip malformed SSE chunks
        }
      }
    }

    return content.trim();
  } catch (error) {
    console.error("streamAskAI:", error);
    return "";
  }
}

export function buildListingsContext(
  listings: Array<{
    name: string;
    location: string;
    price: number;
    bhk: number;
    growthScore: number;
    rentalYield: number;
  }>,
): string {
  if (listings.length === 0) return "";

  const rows = listings
    .slice(0, 8)
    .map(
      (p) =>
        `- ${p.name} | ${p.location} | ₹${Math.round(p.price / 100_000)}L | ${p.bhk} BHK | Score ${p.growthScore} | Yield ${p.rentalYield}%`,
    )
    .join("\n");

  return `\n\nCURRENT LISTINGS IN OUR DATABASE:\n${rows}\n\nMention matching listings when relevant.`;
}
