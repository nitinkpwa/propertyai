/**
 * MVP Zero-Level Testing — reset demo/test data.
 *
 * Runs supabase/scripts/reset_demo_data.sql against Supabase Postgres,
 * clears storage objects in property-photos, and prints a before/after report.
 *
 * Usage:
 *   Add SUPABASE_DB_PASSWORD + SUPABASE_SERVICE_ROLE_KEY to .env.local
 *   npm run db:reset-demo-data
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
Cannot reset demo data — missing database credentials.

Add SUPABASE_DB_PASSWORD=<your-db-password> to .env.local
Then run: npm run db:reset-demo-data

Or paste supabase/scripts/reset_demo_data.sql into:
  https://supabase.com/dashboard/project/${projectRef}/sql/new
`);
  process.exit(1);
}

const COUNT_QUERIES = [
  ["admins", `SELECT count(*)::int AS n FROM public.profiles WHERE role = 'admin'`],
  ["buyers", `SELECT count(*)::int AS n FROM public.profiles WHERE role = 'buyer'`],
  ["sellers", `SELECT count(*)::int AS n FROM public.profiles WHERE role = 'seller'`],
  ["connect_partners_profiles", `SELECT count(*)::int AS n FROM public.profiles WHERE role = 'builder'`],
  ["connect_partners", `SELECT count(*)::int AS n FROM public.connect_partners`],
  ["properties", `SELECT count(*)::int AS n FROM public.properties`],
  ["leads", `SELECT count(*)::int AS n FROM public.crm_leads`],
  ["site_visits", `SELECT count(*)::int AS n FROM public.site_visits`],
  ["conversations", `SELECT count(*)::int AS n FROM public.conversations`],
  ["notifications", `SELECT count(*)::int AS n FROM public.crm_notifications`],
  ["saved_properties", `SELECT count(*)::int AS n FROM public.saved_properties`],
  ["compared_properties", `SELECT count(*)::int AS n FROM public.compared_properties`],
  ["property_views", `SELECT count(*)::int AS n FROM public.property_views`],
  ["inquiries", `SELECT count(*)::int AS n FROM public.inquiries`],
  ["auth_users", `SELECT count(*)::int AS n FROM auth.users`],
];

async function snapshotCounts(client) {
  const out = {};
  for (const [key, sql] of COUNT_QUERIES) {
    try {
      const { rows } = await client.query(sql);
      out[key] = rows[0]?.n ?? 0;
    } catch (err) {
      if (String(err.message).includes("does not exist")) {
        out[key] = 0;
      } else {
        throw err;
      }
    }
  }
  return out;
}

async function clearPropertyPhotos() {
  if (!serviceKey) {
    console.warn("⚠ SUPABASE_SERVICE_ROLE_KEY missing — skipping storage cleanup");
    return { cleared: 0, skipped: true };
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let cleared = 0;
  const prefixes = [""];

  // List top-level folders / files and remove recursively
  async function wipeFolder(path) {
    const { data, error } = await sb.storage.from("property-photos").list(path, {
      limit: 1000,
    });
    if (error) {
      if (String(error.message).toLowerCase().includes("not found")) return;
      throw error;
    }
    if (!data?.length) return;

    const files = [];
    for (const item of data) {
      const full = path ? `${path}/${item.name}` : item.name;
      // folders have null id / no metadata in some API versions
      if (item.id === null || item.metadata === null) {
        await wipeFolder(full);
      } else {
        files.push(full);
      }
    }
    if (files.length) {
      const { error: removeError } = await sb.storage.from("property-photos").remove(files);
      if (removeError) throw removeError;
      cleared += files.length;
    }
  }

  for (const prefix of prefixes) {
    await wipeFolder(prefix);
  }

  return { cleared, skipped: false };
}

function printReport(before, after, adminRow, storage) {
  const keys = Object.keys(before);
  console.log("\n========== MVP ZERO-LEVEL CLEANUP REPORT ==========\n");
  console.log(
    `${"Metric".padEnd(28)} ${"Before".padStart(8)} ${"After".padStart(8)} ${"Deleted".padStart(8)}`,
  );
  console.log("-".repeat(56));
  for (const key of keys) {
    const b = before[key] ?? 0;
    const a = after[key] ?? 0;
    console.log(
      `${key.padEnd(28)} ${String(b).padStart(8)} ${String(a).padStart(8)} ${String(b - a).padStart(8)}`,
    );
  }

  console.log("\n---------- Verification ----------");
  const checks = [
    ["1 Admin", after.admins === 1],
    ["0 Buyers", after.buyers === 0],
    ["0 Sellers", after.sellers === 0],
    ["0 Connect Partners", after.connect_partners_profiles === 0 && after.connect_partners === 0],
    ["0 Properties", after.properties === 0],
    ["0 Leads", after.leads === 0],
    ["0 Site Visits", after.site_visits === 0],
    ["0 Conversations", after.conversations === 0],
    ["0 Notifications", after.notifications === 0],
    ["0 Saved Properties", after.saved_properties === 0],
  ];
  for (const [label, ok] of checks) {
    console.log(`${ok ? "✓" : "✗"} ${label}`);
  }

  if (adminRow) {
    console.log("\nPreserved admin:");
    console.log(`  id:    ${adminRow.id}`);
    console.log(`  name:  ${adminRow.full_name ?? "—"}`);
    console.log(`  email: ${adminRow.auth_email ?? "—"}`);
    console.log(`  role:  ${adminRow.role}`);
  }

  if (storage?.skipped) {
    console.log("\nStorage: skipped (no service role key)");
  } else {
    console.log(`\nStorage: removed ${storage?.cleared ?? 0} object(s) from property-photos`);
  }

  const allOk = checks.every(([, ok]) => ok);
  console.log(`\n${allOk ? "RESET COMPLETE — ready for MVP Zero-Level Testing." : "RESET FINISHED WITH FAILED CHECKS."}`);
  console.log("===================================================\n");
  return allOk;
}

const sqlPath = resolve(root, "supabase/scripts/reset_demo_data.sql");
const sql = readFileSync(sqlPath, "utf8");

const pg = await import("pg");
const client = new pg.default.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

console.log(`Connecting to db.${projectRef}.supabase.co …`);

try {
  await client.connect();

  console.log("Capturing BEFORE counts …");
  const before = await snapshotCounts(client);

  console.log("Running reset_demo_data.sql …");
  await client.query(sql);

  console.log("Capturing AFTER counts …");
  const after = await snapshotCounts(client);

  let adminRow = null;
  try {
    const { rows: adminRows } = await client.query(`
      SELECT p.id, p.full_name, p.role, u.email AS auth_email
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      WHERE p.role = 'admin'
      ORDER BY u.created_at ASC NULLS LAST
      LIMIT 1
    `);
    adminRow = adminRows[0] ?? null;
  } catch (err) {
    console.warn("Could not load admin details:", err.message);
  }

  console.log("Clearing property-photos storage objects …");
  const storage = await clearPropertyPhotos();

  const ok = printReport(before, after, adminRow, storage);
  process.exit(ok ? 0 : 2);
} catch (err) {
  console.error("\nReset failed:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
