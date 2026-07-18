/**
 * Apply seller UPDATE WITH CHECK + DELETE ownership RLS.
 * Usage: node scripts/apply-seller-update-delete-rls.mjs
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
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!supabaseUrl || !dbPassword || !projectRef) {
  console.error("Missing env");
  process.exit(1);
}

const sql = readFileSync(
  resolve(root, "supabase/migrations/20250718130000_properties_seller_update_with_check.sql"),
  "utf8",
);

const pg = await import("pg");
const client = new pg.default.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query(sql);
const { rows } = await client.query(`
  SELECT polname, polcmd,
         pg_get_expr(polqual, polrelid) AS using_expr,
         pg_get_expr(polwithcheck, polrelid) AS check_expr
  FROM pg_policy
  WHERE polrelid = 'public.properties'::regclass
    AND polname IN ('Sellers can update own properties', 'Sellers can delete own properties')
`);
console.log(JSON.stringify(rows, null, 2));
await client.end();
console.log("Applied seller update/delete RLS.");
