import type { AskSection } from "./types";

/** Pure markdown helpers — safe for client bundles (no OpenAI). */

export function parseMarkdownSections(content: string): AskSection[] {
  const sections: AskSection[] = [];
  const lines = content.split("\n");
  let currentTitle = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      if (currentTitle && currentContent.length > 0) {
        sections.push({
          title: currentTitle.replace(/^[✅⚠️📊🏗️💰]\s*/, "").trim(),
          content: currentContent.join("\n").trim(),
        });
      }
      currentTitle = headingMatch[1].trim();
      currentContent = [];
    } else if (currentTitle) {
      currentContent.push(line);
    }
  }

  if (currentTitle && currentContent.length > 0) {
    sections.push({
      title: currentTitle.replace(/^[✅⚠️📊🏗️💰]\s*/, "").trim(),
      content: currentContent.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.content.length > 0);
}

export function extractPropertyRationales(
  answer: string,
  propertyNames: string[],
): Record<string, string> {
  const rationales: Record<string, string> = {};

  for (const name of propertyNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `###\\s*#?\\d*\\s*${escaped}[\\s\\S]*?\\*\\*Why (?:it fits|ranked here):\\*\\*\\s*(.+?)(?=\\n-|\\n###|$)`,
        "i",
      ),
      new RegExp(
        `###\\s*${escaped}[\\s\\S]*?\\*\\*Why it fits:\\*\\*\\s*(.+?)(?=\\n-|\\n###|$)`,
        "i",
      ),
      new RegExp(
        `${escaped}[\\s\\S]*?\\*\\*Why it fits:\\*\\*\\s*(.+?)(?=\\n|$)`,
        "i",
      ),
    ];

    for (const pattern of patterns) {
      const match = answer.match(pattern);
      if (match?.[1]) {
        rationales[name] = match[1].trim();
        break;
      }
    }
  }

  return rationales;
}
