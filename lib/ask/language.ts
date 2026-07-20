/**
 * Lightweight response-language detection for AreaIQ Advisor.
 * Matches the user's latest message: English, Hindi (Devanagari), or Hinglish.
 */

export type ResponseLanguage = "english" | "hindi" | "hinglish";

const HINGLISH_MARKERS =
  /\b(mujhe|mere|mera|meri|kya|hai|hain|ho|hoon|hun|chahiye|chahie|dikhao|dikha|batao|bata|kitna|kitne|kitni|lac|lakh|crore|karod|mein|me|wala|wali|wale|nahi|nahin|achha|accha|theek|thik|bhai|yaar|matlab|dono|kaise|kaisa|kahan|kaha|abhi|toh|bhi|aur|bas|pls|plz|please|under|budget|flat|ghar|property|invest)\b/gi;

export function detectResponseLanguage(text: string): ResponseLanguage {
  const trimmed = text.trim();
  if (!trimmed) return "english";

  const devanagariChars = (trimmed.match(/[\u0900-\u097F]/g) ?? []).length;
  const latinLetters = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  const totalLetters = devanagariChars + latinLetters || 1;

  if (devanagariChars / totalLetters >= 0.35) {
    // Mixed Devanagari + substantial Latin → Hinglish; mostly Devanagari → Hindi
    if (latinLetters >= 12 && latinLetters / totalLetters >= 0.25) {
      return "hinglish";
    }
    return "hindi";
  }

  const hinglishHits = trimmed.match(HINGLISH_MARKERS)?.length ?? 0;
  if (hinglishHits >= 2) return "hinglish";

  return "english";
}

/** Prefer the latest user message; fall back to recent user turns for short follow-ups. */
export function detectConversationLanguage(
  latestUserMessage: string,
  history: { role: string; content: string }[] = [],
): ResponseLanguage {
  const latest = latestUserMessage.trim();
  const latestLang = detectResponseLanguage(latest);
  // Short follow-ups like "ok", "3 BHK", "under 80" — keep prior language if strong signal exists
  if (latest.split(/\s+/).length <= 4 && latestLang === "english") {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.role !== "user") continue;
      const prior = detectResponseLanguage(msg.content);
      if (prior !== "english") return prior;
    }
  }
  return latestLang;
}

export function languageInstruction(language: ResponseLanguage): string {
  switch (language) {
    case "hindi":
      return `RESPONSE LANGUAGE (mandatory): Reply entirely in natural Hindi (Devanagari script). Do not switch to English except for proper nouns, project names, and ₹ figures.`;
    case "hinglish":
      return `RESPONSE LANGUAGE (mandatory): Reply in natural Hinglish — everyday Roman Hindi mixed with English, the way a Tricity property consultant speaks with clients. Do not switch to formal English-only prose.`;
    default:
      return `RESPONSE LANGUAGE (mandatory): Reply entirely in natural English.`;
  }
}

export function languageLabel(language: ResponseLanguage): string {
  switch (language) {
    case "hindi":
      return "Hindi";
    case "hinglish":
      return "Hinglish";
    default:
      return "English";
  }
}
