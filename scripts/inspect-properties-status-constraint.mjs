/**
 * Inspect live properties CHECK constraints (status / type / sub_type).
 * Usage: node scripts/inspect-properties-status-constraint.mjs
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

const { rows: checks } = await client.query(`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'public.properties'::regclass
    AND contype = 'c'
  ORDER BY conname
`);
console.log("=== properties CHECK constraints ===");
console.log(JSON.stringify(checks, null, 2));

const { rows: cols } = await client.query(`
  SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'properties'
    AND column_name IN ('status', 'approval_status', 'type', 'sub_type', 'possession')
  ORDER BY column_name
`);
console.log("\n=== relevant columns ===");
console.log(JSON.stringify(cols, null, 2));

const { rows: distinct } = await client.query(`
  SELECT status, count(*)::int AS n
  FROM public.properties
  GROUP BY status
  ORDER BY n DESC
`);
console.log("\n=== distinct status values currently in table ===");
console.log(JSON.stringify(distinct, null, 2));

await client.end();
