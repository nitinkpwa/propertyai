/**
 * Applies site_visit_booking_schema.sql to Supabase Postgres.
 *
 * Usage:
 *   Set SUPABASE_DB_PASSWORD in .env.local (Database password from Supabase Dashboard → Settings → Database)
 *   npm run db:apply-site-visit
 *
 * Or paste supabase/scripts/site_visit_booking_schema.sql into Supabase SQL Editor manually.
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
  2. Paste contents of supabase/scripts/site_visit_booking_schema.sql
  3. Click Run

Option B:
  Add SUPABASE_DB_PASSWORD=<your-db-password> to .env.local
  Then run: npm run db:apply-site-visit
`);
  process.exit(1);
}

const sqlPath = resolve(root, "supabase/scripts/site_visit_booking_schema.sql");
const sql = readFileSync(sqlPath, "utf8");

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("Install pg first: npm install --save-dev pg");
  process.exit(1);
}

const client = new pg.default.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

console.log(`Connecting to db.${projectRef}.supabase.co …`);

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied successfully.");

  for (const table of ["site_visits", "crm_leads", "crm_lead_activities", "crm_notifications"]) {
    const { rows } = await client.query(
      `SELECT to_regclass('public.${table}') AS reg`,
    );
    console.log(`  ${table}: ${rows[0]?.reg ? "OK" : "MISSING"}`);
  }
} catch (err) {
  console.error("Schema apply failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
