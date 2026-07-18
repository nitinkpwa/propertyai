/**
 * Live debug: properties RLS, columns, and a seller-context insert probe.
 * Usage: node scripts/debug-seller-property-insert.mjs
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

const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
const pg = await import("pg");
const client = new pg.default.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows: policies } = await client.query(`
  SELECT polname, polcmd, polroles::regrole[] AS roles,
         pg_get_expr(polqual, polrelid) AS using_expr,
         pg_get_expr(polwithcheck, polrelid) AS check_expr
  FROM pg_policy
  WHERE polrelid = 'public.properties'::regclass
  ORDER BY polname
`);
console.log("=== RLS policies on properties ===");
console.log(JSON.stringify(policies, null, 2));

const { rows: rls } = await client.query(`
  SELECT relrowsecurity, relforcerowsecurity
  FROM pg_class WHERE oid = 'public.properties'::regclass
`);
console.log("\n=== RLS enabled ===", rls[0]);

const { rows: cols } = await client.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'properties'
  ORDER BY ordinal_position
`);
console.log("\n=== properties columns ===");
console.log(JSON.stringify(cols, null, 2));

const { rows: sellers } = await client.query(`
  SELECT id, email, role FROM public.profiles
  WHERE role IN ('seller', 'admin', 'broker', 'builder')
  ORDER BY role, created_at DESC NULLS LAST
  LIMIT 10
`);
console.log("\n=== candidate seller/admin profiles ===");
console.log(JSON.stringify(sellers, null, 2));

const { rows: recent } = await client.query(`
  SELECT id, title, status, seller_id, created_at, updated_at
  FROM public.properties
  ORDER BY created_at DESC NULLS LAST
  LIMIT 10
`);
console.log("\n=== recent properties (service/db) ===");
console.log(JSON.stringify(recent, null, 2));

const { rows: triggers } = await client.query(`
  SELECT tgname, pg_get_triggerdef(oid) AS def
  FROM pg_trigger
  WHERE tgrelid = 'public.properties'::regclass AND NOT tgisinternal
`);
console.log("\n=== triggers ===");
console.log(JSON.stringify(triggers, null, 2));

await client.end();
