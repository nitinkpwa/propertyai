/**
 * Apply seller/admin SELECT RLS fix for properties.
 * Usage: node scripts/apply-seller-select-rls.mjs
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const sql = readFileSync(
  resolve(root, "supabase/migrations/20250718120000_properties_seller_select_rls.sql"),
  "utf8",
);

const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
const pg = await import("pg");
const client = new pg.default.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const { rows: before } = await client.query(`
  SELECT polname, polcmd
  FROM pg_policy
  WHERE polrelid = 'public.properties'::regclass
  ORDER BY polname
`);
console.log("BEFORE policies:", before.map((r) => `${r.polname} (${r.polcmd})`).join(", "));

const { rows: fns } = await client.query(`
  SELECT proname FROM pg_proc WHERE proname = 'is_admin' LIMIT 1
`);
if (!fns.length) {
  console.error("public.is_admin() missing — apply roles migration first");
  await client.end();
  process.exit(1);
}

await client.query(sql);

const { rows: after } = await client.query(`
  SELECT polname, polcmd,
         pg_get_expr(polqual, polrelid) AS using_expr
  FROM pg_policy
  WHERE polrelid = 'public.properties'::regclass
  ORDER BY polname
`);
console.log("\nAFTER policies:");
for (const r of after) {
  console.log(`- ${r.polname} cmd=${r.polcmd} using=${r.using_expr}`);
}

const sellerSelect = after.find((r) => r.polname === "Sellers can select own properties");
if (!sellerSelect) {
  console.error("FAILED: seller select policy not present");
  await client.end();
  process.exit(1);
}

console.log("\nRLS fix applied successfully.");
await client.end();
