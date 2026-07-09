/**
 * Columns verified on live production `public.profiles` (2026-07-04).
 * Do not read or write profile fields outside this set.
 */
/**
 * Columns a user may write to their OWN profile from a client session.
 * `role`, `connect_partner_id`, and `connect_assignment_source` are deliberately
 * EXCLUDED — they are authorization-bearing and are enforced server-side (admin
 * APIs via the service role) and at the database layer (guard triggers in
 * 20250706120000_security_hardening.sql). Never add them back here.
 */
export const PROFILE_WRITABLE_COLUMNS = new Set([
  "id",
  "email",
  "phone",
  "full_name",
  "city",
  "avatar_url",
  "budget_min",
  "budget_max",
  "preferred_locations",
  "preferred_property_types",
  "buying_purpose",
  "buying_timeline",
  "loan_status",
  "occupation",
  "family_size",
  "buyer_notes",
  "contact_email",
]);

export function pickWritableProfileFields(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (PROFILE_WRITABLE_COLUMNS.has(key)) {
      safe[key] = value;
    }
  }
  return safe;
}

/** Profile embed for PostgREST selects — only existing columns. */
export const PROFILE_EMBED_SELECT =
  "id, full_name, email, phone, role, city, avatar_url, contact_email, connect_partner_id, created_at";

export const PROFILE_BUYER_EMBED_SELECT =
  "id, full_name, email, phone, avatar_url, city, buying_purpose, buying_timeline, budget_min, budget_max, loan_status, occupation, family_size, preferred_locations, preferred_property_types, buyer_notes, contact_email, created_at";
