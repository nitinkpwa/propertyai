/**
 * Presentation-only Title Case for property / project names.
 * Does not mutate database values — apply only when rendering or mapping to view models.
 */

/** Short / domain acronyms that must not become title case (e.g. It, Rera). */
const PRESERVED_ACRONYMS = new Set([
  "AI",
  "BHK",
  "CEO",
  "CFO",
  "CRM",
  "CTO",
  "EMI",
  "EU",
  "HQ",
  "IT",
  "ITES",
  "ML",
  "NH",
  "NRI",
  "RERA",
  "ROI",
  "SEZ",
  "UAE",
  "UK",
  "USA",
  // Roman numerals common in phase names
  "II",
  "III",
  "IV",
  "VI",
  "VII",
  "VIII",
  "IX",
  "XI",
  "XII",
]);

/**
 * Alphanumeric product / sector codes: PR7, NH21, A1, SEC70A.
 * Letters + at least one digit, no other characters.
 */
function isAlphanumericCode(token: string): boolean {
  return /[A-Za-z]/.test(token) && /\d/.test(token) && /^[A-Za-z0-9]+$/.test(token);
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function formatApostropheWord(word: string): string {
  return word
    .split("'")
    .map((part) => (part ? titleCaseWord(part) : part))
    .join("'");
}

function formatToken(token: string): string {
  if (!token) return token;

  if (token.includes("-")) {
    return token.split("-").map(formatToken).join("-");
  }

  if (isAlphanumericCode(token)) {
    return token.toUpperCase();
  }

  const upper = token.toUpperCase();
  if (PRESERVED_ACRONYMS.has(upper)) {
    return upper;
  }

  if (token.includes("'")) {
    return formatApostropheWord(token);
  }

  return titleCaseWord(token);
}

/**
 * Normalize a property/project title for display.
 *
 * @example
 * formatPropertyTitle("GOLDEN ERA HOMES") // "Golden Era Homes"
 * formatPropertyTitle("THE ANTILLIA") // "The Antillia"
 * formatPropertyTitle("myst aerotown dayalpur mohali") // "Myst Aerotown Dayalpur Mohali"
 * formatPropertyTitle("PR7 IT PARK") // "PR7 IT Park"
 */
export function formatPropertyTitle(title: string | null | undefined): string {
  if (title == null) return "";
  const normalized = String(title).trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.split(" ").map(formatToken).join(" ");
}
