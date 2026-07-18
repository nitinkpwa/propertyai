/**
 * Verify properties.status inserts against live CHECK constraint.
 * Inserts a paused row (should succeed), attempts draft (should fail), then cleans up.
 * Usage: node scripts/verify-property-status-insert.mjs
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
      if (!eq || eq === -1) continue;
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

const { rows: sellers } = await client.query(
  `SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1`,
);
const sellerId = sellers[0]?.id;
if (!sellerId) {
  console.error("No admin profile found to satisfy seller_id NOT NULL");
  await client.end();
  process.exit(1);
}

const title = `__status_verify_${Date.now()}__`;
let pausedOk = false;
let draftRejected = false;

try {
  const { rows } = await client.query(
    `INSERT INTO public.properties (title, type, sub_type, price, city, location, seller_id, status)
     VALUES ($1, 'buy', 'flat', 1000000, 'Mohali', 'Verify Status Insert', $2, 'paused')
     RETURNING id, status`,
    [title, sellerId],
  );
  pausedOk = true;
  console.log(`INSERT status=paused: OK id=${rows[0].id} status=${rows[0].status}`);
  await client.query(`DELETE FROM public.properties WHERE id = $1`, [rows[0].id]);
  console.log("CLEANUP paused row: OK");
} catch (err) {
  console.log(`INSERT status=paused: FAIL ${err.message}`);
}

try {
  await client.query(
    `INSERT INTO public.properties (title, type, sub_type, price, city, location, seller_id, status)
     VALUES ($1, 'buy', 'flat', 1000000, 'Mohali', 'Verify Status Insert', $2, 'draft')`,
    [`${title}_draft`, sellerId],
  );
  console.log("INSERT status=draft: UNEXPECTED SUCCESS");
} catch (err) {
  draftRejected = String(err.message).includes("properties_status_check");
  console.log(
    draftRejected
      ? `INSERT status=draft: EXPECTED FAIL — ${err.message}`
      : `INSERT status=draft: FAIL (other) — ${err.message}`,
  );
}

await client.end();

if (!pausedOk || !draftRejected) {
  process.exit(1);
}
console.log("\nVerification passed: app default `paused` is constraint-safe; `draft` is rejected by DB.");