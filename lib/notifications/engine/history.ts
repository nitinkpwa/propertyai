import type { IntelligenceNotification } from "../types";

const HISTORY_KEY = "areaiq_intel_history_v1";
const MAX_HISTORY = 80;

export interface IntelligenceHistoryEntry {
  id: string;
  title: string;
  score: number;
  source: string;
  reason: string;
  confidence: number;
  timestamp: string;
  seenAt: string;
}

function readHistory(): IntelligenceHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IntelligenceHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: IntelligenceHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    /* quota */
  }
}

export function recordIntelligenceSeen(item: IntelligenceNotification) {
  const prev = readHistory().filter((e) => e.id !== item.id);
  const entry: IntelligenceHistoryEntry = {
    id: item.id,
    title: item.title,
    score: item.score,
    source: item.source,
    reason: item.reason,
    confidence: item.confidence,
    timestamp: item.timestamp,
    seenAt: new Date().toISOString(),
  };
  writeHistory([entry, ...prev]);
}

export function getIntelligenceHistory(): IntelligenceHistoryEntry[] {
  return readHistory();
}
