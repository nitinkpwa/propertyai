/**
 * Inspect active properties + whether CARD select columns exist.
 * Usage: node scripts/inspect-public-listings.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!supabaseUrl || !dbPassword || !projectRef || !anonKey) {
  console.error("Missing env");
  process.exit(1);
}

const pg = await import("pg");
const client = new pg.default.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const wanted = [
  "status",
  "approval_status",
  "is_active",
  "published_at",
  "deleted_at",
  "seller_id",
  "growth_score",
  "rental_yield",
  "ai_verified",
  "rera_verified",
  "builder_name",
  "featured_image",
];

const { rows: cols } = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='properties'
     AND column_name = ANY($1::text[])`,
  [wanted],
);
console.log("=== columns present ===", cols.map((c) => c.column_name));

const { rows: active } = await client.query(`
  SELECT id, title, status, deleted_at, seller_id, created_at, updated_at
  FROM public.properties
  WHERE status = 'active'
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 10
`);
console.log("=== active rows (service) ===", active);

const missing = wanted.filter((c) => !cols.some((r) => r.column_name === c));
console.log("=== columns missing ===", missing);

await client.end();

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(supabaseUrl, anonKey);

const legacyBrokenSelect =
  "id, seller_id, title, status, growth_score, rental_yield, ai_verified, rera_verified";

const broken = await supabase
  .from("properties")
  .select(legacyBrokenSelect)
  .eq("status", "active");

console.log("\n=== anon LEGACY select (pre-fix) ===");
console.log({
  count: broken.data?.length ?? 0,
  error: broken.error?.message ?? null,
  code: broken.error?.code ?? null,
});

const fixedSelect =
  "id, seller_id, title, description, type, sub_type, price, area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos, amenities, status, is_featured, created_at, updated_at, views, builder_name, furnishing, parking, facing, nearby_places, rera_number, possession, featured_image, deleted_at, seller:profiles!properties_seller_id_fkey(full_name)";

const ok = await supabase
  .from("properties")
  .select(fixedSelect)
  .eq("status", "active")
  .is("deleted_at", null)
  .order("created_at", { ascending: false });

console.log("\n=== anon FIXED select (post-fix) ===");
console.log({
  count: ok.data?.length ?? 0,
  error: ok.error?.message ?? null,
  titles: (ok.data ?? []).map((r) => r.title),
});