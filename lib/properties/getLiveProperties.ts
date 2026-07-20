/**
 * Shared public catalog fetch for Home, /properties, Ask search, recommendations.
 *
 * Live listing rules (schema-accurate on production):
 * - status = 'active'
 * - deleted_at IS NULL
 * - approval_status / is_published do NOT exist — never filter on them
 *
 * Missing optional columns (e.g. calculated_price before migration) must NOT
 * empty the catalog — we retry without them and log the reason.
 */

import { supabase as defaultClient, type Property } from "@/lib/supabase";
import {
  PROPERTIES_CARD_SELECT,
  PROPERTIES_CARD_SELECT_CORE,
} from "@/lib/seller/propertySchema";

export type LivePropertyRow = Omit<Property, "contact_name" | "contact_phone"> & {
  contact_name?: string | null;
  contact_phone?: string | null;
  calculated_price?: number | null;
  growth_score?: number | null;
  rental_yield?: number | null;
  ai_verified?: boolean | null;
  rera_verified?: boolean | null;
  builder_name?: string | null;
  possession?: string | null;
  featured_image?: string | null;
  nearby_places?: unknown;
  deleted_at?: string | null;
  facing?: string | null;
  furnishing?: string | null;
  parking?: string | null;
  rera_number?: string | null;
  seller?: { full_name?: string | null } | null;
};

export interface GetLivePropertiesOptions {
  /** Defaults to browser/anon supabase client */
  client?: typeof defaultClient;
  includeSeller?: boolean;
  limit?: number;
  city?: string;
  excludeId?: string;
  orderBy?: "created_at" | "price";
  ascending?: boolean;
}

type QueryResult = {
  data: LivePropertyRow[] | null;
  error: { message: string; code?: string } | null;
};

let calculatedPriceSupported: boolean | null = null;

function isMissingColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  return /column .* does not exist/i.test(error.message ?? "");
}

function buildSelect(includeSeller: boolean, withCalculatedPrice: boolean): string {
  const base = withCalculatedPrice ? PROPERTIES_CARD_SELECT : PROPERTIES_CARD_SELECT_CORE;
  if (!includeSeller) return base;
  return `${base}, seller:profiles!properties_seller_id_fkey(full_name)`;
}

async function runLiveQuery(
  client: typeof defaultClient,
  select: string,
  options: GetLivePropertiesOptions,
): Promise<{
  rows: LivePropertyRow[];
  error: { message?: string; code?: string } | null;
}> {
  let query = client
    .from("properties")
    .select(select)
    .eq("status", "active")
    .is("deleted_at", null);

  if (options.city) {
    query = query.eq("city", options.city);
  }
  if (options.excludeId) {
    query = query.neq("id", options.excludeId);
  }

  const orderBy = options.orderBy ?? "created_at";
  query = query.order(orderBy, { ascending: options.ascending ?? false });

  if (options.limit != null) {
    query = query.limit(options.limit);
  }

  const { data, error } = (await query) as QueryResult;
  return {
    rows: (data as LivePropertyRow[] | null) ?? [],
    error: error ? { message: error.message, code: error.code } : null,
  };
}

/**
 * Fetch all publicly visible live listings.
 * Retries without optional columns when PostgREST rejects the select.
 */
export async function getLiveProperties(
  options: GetLivePropertiesOptions = {},
): Promise<LivePropertyRow[]> {
  const client = options.client ?? defaultClient;
  const includeSeller = options.includeSeller ?? true;
  const preferCalc = calculatedPriceSupported !== false;

  const selectPrimary = buildSelect(includeSeller, preferCalc);

  console.log("[getLiveProperties] query", {
    select: selectPrimary,
    where: { status: "active", deleted_at: null },
    city: options.city ?? null,
    excludeId: options.excludeId ?? null,
    limit: options.limit ?? null,
  });

  let { rows, error } = await runLiveQuery(client, selectPrimary, options);

  if (error && isMissingColumnError(error) && /calculated_price/i.test(error.message ?? "")) {
    console.warn("[getLiveProperties] calculated_price missing — retrying without it", {
      message: error.message,
      code: error.code,
      reason: "Missing calculated_price must NOT exclude live properties",
    });
    calculatedPriceSupported = false;
    const fallbackSelect = buildSelect(includeSeller, false);
    ({ rows, error } = await runLiveQuery(client, fallbackSelect, options));
  } else if (!error && preferCalc) {
    calculatedPriceSupported = true;
  }

  if (error) {
    console.error("[getLiveProperties] failed", {
      message: error.message,
      code: error.code,
      why:
        "Public catalog requires status=active and deleted_at IS NULL. " +
        "Missing select columns or RLS denials return zero rows.",
    });
    return [];
  }

  console.log("[getLiveProperties] ok", {
    count: rows.length,
    ids: rows.map((r) => r.id),
    titles: rows.map((r) => r.title),
    filteredReason:
      rows.length === 0
        ? "No rows matched status=active AND deleted_at IS NULL under current RLS"
        : null,
  });

  return rows;
}
