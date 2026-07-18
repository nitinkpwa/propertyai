/**
 * Confirm seller SELECT RLS + existing paused rows after fix.
 * Usage: node scripts/verify-seller-property-visibility.mjs
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

const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
const pg = await import("pg");
const client = new pg.default.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows: policies } = await client.query(`
  SELECT polname FROM pg_policy
  WHERE polrelid = 'public.properties'::regclass
    AND polname IN ('Sellers can select own properties', 'Admins manage all properties')
`);
console.log("Required policies present:", policies.map((p) => p.polname));

const { rows: paused } = await client.query(`
  SELECT id, title, status, seller_id, created_at
  FROM public.properties
  WHERE status = 'paused'
  ORDER BY created_at DESC
  LIMIT 5
`);
console.log("Paused properties in DB:", paused);

const sellerId = paused[0]?.seller_id;
if (sellerId) {
  // Simulate RLS as that seller via SET LOCAL request.jwt.claim.sub
  await client.query("BEGIN");
  await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [sellerId]);
  await client.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`);
  await client.query(`SET LOCAL ROLE authenticated`);
  const { rows: visible } = await client.query(
    `SELECT id, title, status FROM public.properties WHERE seller_id = $1`,
    [sellerId],
  );
  console.log("Visible to seller via RLS simulation:", visible);
  await client.query("ROLLBACK");
}

await client.end();

if (!policies.some((p) => p.polname === "Sellers can select own properties")) {
  process.exit(1);
}
console.log("\nVerification OK");
