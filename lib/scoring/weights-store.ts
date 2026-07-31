/**
 * Admin weight config loader / saver.
 * Defaults live in weights.ts; overrides in scoring_weights table.
 */

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AREAIQ_DEFAULT_WEIGHTS,
  BUILDER_DEFAULT_WEIGHTS,
  INVESTMENT_DEFAULT_WEIGHTS,
  LEGAL_DEFAULT_WEIGHTS,
  LOCATION_DEFAULT_WEIGHTS,
  mergeWeights,
  type WeightMap,
} from "./weights";

export type ScoreWeightKind =
  | "areaiq"
  | "investment"
  | "legal"
  | "builder"
  | "location";

const DEFAULTS: Record<ScoreWeightKind, WeightMap> = {
  areaiq: { ...AREAIQ_DEFAULT_WEIGHTS },
  investment: { ...INVESTMENT_DEFAULT_WEIGHTS },
  legal: { ...LEGAL_DEFAULT_WEIGHTS },
  builder: { ...BUILDER_DEFAULT_WEIGHTS },
  location: { ...LOCATION_DEFAULT_WEIGHTS },
};

export interface ScoringWeightRow {
  id: string;
  kind: ScoreWeightKind;
  weights: WeightMap;
  label: string;
  isActive: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export function getDefaultWeights(kind: ScoreWeightKind): WeightMap {
  return { ...DEFAULTS[kind] };
}

export async function fetchActiveWeights(
  kind: ScoreWeightKind,
): Promise<{ id: string | null; weights: WeightMap }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("scoring_weights")
      .select("id, weights, is_active")
      .eq("kind", kind)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.weights) {
      return { id: null, weights: getDefaultWeights(kind) };
    }

    return {
      id: data.id as string,
      weights: mergeWeights(
        getDefaultWeights(kind),
        data.weights as Partial<WeightMap>,
      ),
    };
  } catch {
    return { id: null, weights: getDefaultWeights(kind) };
  }
}

export async function fetchAllActiveWeightOverrides(): Promise<{
  areaIq?: WeightMap;
  investment?: WeightMap;
  legal?: WeightMap;
  builder?: WeightMap;
  location?: WeightMap;
  configIds: Partial<Record<ScoreWeightKind, string>>;
}> {
  const kinds: ScoreWeightKind[] = [
    "areaiq",
    "investment",
    "legal",
    "builder",
    "location",
  ];
  const results = await Promise.all(kinds.map((k) => fetchActiveWeights(k)));
  const configIds: Partial<Record<ScoreWeightKind, string>> = {};
  const out: {
    areaIq?: WeightMap;
    investment?: WeightMap;
    legal?: WeightMap;
    builder?: WeightMap;
    location?: WeightMap;
    configIds: Partial<Record<ScoreWeightKind, string>>;
  } = { configIds };

  kinds.forEach((kind, i) => {
    const row = results[i];
    if (row.id) configIds[kind] = row.id;
    if (kind === "areaiq") out.areaIq = row.weights;
    if (kind === "investment") out.investment = row.weights;
    if (kind === "legal") out.legal = row.weights;
    if (kind === "builder") out.builder = row.weights;
    if (kind === "location") out.location = row.weights;
  });

  return out;
}
