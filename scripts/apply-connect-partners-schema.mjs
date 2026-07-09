/**
 * Applies connect_partners_complete.sql to Supabase Postgres.
 *
 * Usage:
 *   Add SUPABASE_DB_PASSWORD=<database-password> to .env.local
 *   npm run db:apply-connect-partners
 *
 * Or paste supabase/migrations/20250704120000_connect_partners_system.sql
 * into the Supabase SQL Editor.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbPassword =
  process.env.SUPABASE_DB_PASSWORD ??
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DB_URL;

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}

const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error("Could not parse project ref from Supabase URL");
  process.exit(1);
}

const connectionString =
  typeof dbPassword === "string" && dbPassword.startsWith("postgres")
    ? dbPassword
    : dbPassword
      ? `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`
      : null;

if (!connectionString) {
  console.error(`
Cannot apply schema automatically — no database credentials.

Option A (recommended):
  1. Open https://supabase.com/dashboard/project/${projectRef}/sql/new
  2. Paste contents of supabase/migrations/20250704120000_connect_partners_system.sql
  3. Click Run

Option B:
  Add SUPABASE_DB_PASSWORD=<your-db-password> to .env.local
  Then run: npm run db:apply-connect-partners
`);
  process.exit(1);
}

// Canonical source is the migration; the scripts/ copy was a duplicate.
const sqlPath = resolve(
  root,
  "supabase/migrations/20250704120000_connect_partners_system.sql",
);
const sql = readFileSync(sqlPath, "utf8");

const pg = await import("pg");
const client = new pg.default.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

console.log(`Applying Connect Partner schema to db.${projectRef}.supabase.co …`);

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied successfully.\n");

  const checks = [
    { kind: "table", name: "connect_partners" },
    { kind: "table", name: "connect_partner_activities" },
    { kind: "column", table: "profiles", name: "connect_partner_id" },
    { kind: "column", table: "properties", name: "assigned_connect_id" },
    { kind: "column", table: "properties", name: "connect_partner_id" },
    { kind: "column", table: "crm_leads", name: "assigned_connect_id" },
    { kind: "column", table: "crm_leads", name: "connect_partner_id" },
    { kind: "function", name: "get_user_connect_partner_id" },
    { kind: "function", name: "is_connect_partner_user" },
  ];

  for (const check of checks) {
    if (check.kind === "table") {
      const { rows } = await client.query(
        `SELECT to_regclass('public.${check.name}') AS reg`,
      );
      console.log(`  ${check.name}: ${rows[0]?.reg ? "OK" : "MISSING"}`);
    } else if (check.kind === "column") {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [check.table, check.name],
      );
      console.log(`  ${check.table}.${check.name}: ${rows.length ? "OK" : "MISSING"}`);
    } else if (check.kind === "function") {
      const { rows } = await client.query(
        `SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = $1`,
        [check.name],
      );
      console.log(`  ${check.name}(): ${rows.length ? "OK" : "MISSING"}`);
    }
  }
} catch (err) {
  console.error("Schema apply failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
