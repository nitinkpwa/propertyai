/**
 * Applies the property-based Connect ownership migration to Supabase Postgres.
 *
 * Usage:
 *   Add SUPABASE_DB_PASSWORD=<database-password> to .env.local
 *   npm run db:apply-property-ownership
 *
 * Or paste supabase/migrations/20250707120000_property_based_connect_ownership.sql
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
  2. Paste contents of supabase/migrations/20250707120000_property_based_connect_ownership.sql
  3. Click Run

Option B:
  Add SUPABASE_DB_PASSWORD=<your-db-password> to .env.local
  Then run: npm run db:apply-property-ownership
`);
  process.exit(1);
}

const sqlPath = resolve(
  root,
  "supabase/migrations/20250707120000_property_based_connect_ownership.sql",
);
const sql = readFileSync(sqlPath, "utf8");

const pg = await import("pg");
const client = new pg.default.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

console.log(`Applying property-based ownership schema to db.${projectRef}.supabase.co …`);

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied successfully.\n");

  const checks = [
    { kind: "column", table: "inquiries", name: "connect_partner_id" },
    { kind: "column", table: "crm_lead_activities", name: "connect_partner_id" },
    { kind: "column", table: "site_visits", name: "connect_partner_id" },
    { kind: "index", name: "crm_leads_buyer_general_uniq" },
    { kind: "index", name: "crm_leads_buyer_partner_uniq" },
    { kind: "trigger", table: "inquiries", name: "inquiries_stamp_connect_partner" },
    { kind: "trigger", table: "site_visits", name: "site_visits_stamp_connect_partner" },
    { kind: "trigger", table: "crm_lead_activities", name: "crm_lead_activities_stamp_connect_partner" },
    { kind: "function", name: "stamp_connect_partner_from_property" },
    { kind: "function", name: "is_connect_assigned_to_buyer" },
    { kind: "function", name: "is_connect_assigned_to_lead" },
  ];

  for (const check of checks) {
    if (check.kind === "column") {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [check.table, check.name],
      );
      console.log(`  ${check.table}.${check.name}: ${rows.length ? "OK" : "MISSING"}`);
    } else if (check.kind === "index") {
      const { rows } = await client.query(
        `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
        [check.name],
      );
      console.log(`  index ${check.name}: ${rows.length ? "OK" : "MISSING"}`);
    } else if (check.kind === "trigger") {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.triggers
         WHERE event_object_schema = 'public'
           AND event_object_table = $1 AND trigger_name = $2`,
        [check.table, check.name],
      );
      console.log(`  trigger ${check.table}.${check.name}: ${rows.length ? "OK" : "MISSING"}`);
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

  // Post-migration ownership sanity checks
  const { rows: leakRows } = await client.query(`
    SELECT count(*)::int AS mismatched
    FROM public.site_visits sv
    JOIN public.properties p ON p.id = sv.property_id
    WHERE sv.connect_partner_id IS DISTINCT FROM p.connect_partner_id
  `);
  console.log(`\n  site_visits with partner != property partner: ${leakRows[0].mismatched}`);

  const { rows: buyerRows } = await client.query(`
    SELECT count(*)::int AS assigned
    FROM public.profiles
    WHERE role = 'buyer' AND connect_partner_id IS NOT NULL
  `);
  console.log(`  buyer profiles still owned by a partner: ${buyerRows[0].assigned}`);

  const { rows: dupRows } = await client.query(`
    SELECT count(*)::int AS dups FROM (
      SELECT buyer_id, connect_partner_id
      FROM public.crm_leads
      GROUP BY buyer_id, connect_partner_id
      HAVING count(*) > 1
    ) d
  `);
  console.log(`  duplicate (buyer, partner) leads: ${dupRows[0].dups}`);
} catch (err) {
  console.error("Schema apply failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
