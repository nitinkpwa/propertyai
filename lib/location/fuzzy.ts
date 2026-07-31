/**
 * Lightweight fuzzy string similarity for location matching.
 * No external deps — Levenshtein + token overlap.
 */

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[–—−]/g, "-")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** Similarity 0–100 (100 = identical). */
export function stringSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) {
    const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
    return Math.round(70 + ratio * 30);
  }

  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const base = Math.max(0, 1 - dist / maxLen);

  // Token overlap bonus
  const ta = new Set(na.split(" ").filter(Boolean));
  const tb = new Set(nb.split(" ").filter(Boolean));
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  const tokenScore = ta.size && tb.size ? overlap / Math.max(ta.size, tb.size) : 0;

  return Math.round(Math.min(100, (base * 0.7 + tokenScore * 0.3) * 100));
}

/** Best similarity of needle against any candidate string. */
export function bestSimilarity(needle: string, candidates: string[]): number {
  let best = 0;
  for (const c of candidates) {
    best = Math.max(best, stringSimilarity(needle, c));
    if (best >= 98) break;
  }
  return best;
}

/** True if haystack contains needle or fuzzy-close token (≥ threshold). */
export function fuzzyIncludes(
  haystack: string,
  needle: string,
  threshold = 84,
): { hit: boolean; score: number } {
  const h = normalizeText(haystack);
  const n = normalizeText(needle);
  if (!h || !n) return { hit: false, score: 0 };
  if (h.includes(n)) return { hit: true, score: 100 };

  // Compare against sliding windows / tokens of similar length
  const tokens = h.split(/[\s,|/.-]+/).filter((t) => t.length >= 3);
  let best = 0;
  for (const t of tokens) {
    best = Math.max(best, stringSimilarity(n, t));
  }

  // Multi-word: check contiguous chunks
  if (n.includes(" ")) {
    best = Math.max(best, stringSimilarity(n, h));
  }

  return { hit: best >= threshold, score: best };
}
