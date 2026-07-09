/**
 * Read-only verification of the property-based Connect ownership model.
 *
 * Usage: npm run db:check-property-ownership
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
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef || !dbPassword) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD in .env.local");
  process.exit(1);
}

const pg = await import("pg");
const client = new pg.default.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

let failures = 0;

async function check(label, sql, expectZero = true) {
  const { rows } = await client.query(sql);
  const n = rows[0]?.n ?? 0;
  const ok = expectZero ? Number(n) === 0 : true;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: ${n}`);
}

try {
  await client.connect();
  console.log(`Verifying property-based ownership on db.${projectRef}.supabase.co\n`);

  await check(
    "buyer profiles owned by a partner (must be 0)",
    `SELECT count(*)::int AS n FROM public.profiles
     WHERE role = 'buyer' AND connect_partner_id IS NOT NULL`,
  );

  await check(
    "inquiries whose partner stamp differs from their property (must be 0)",
    `SELECT count(*)::int AS n FROM public.inquiries i
     JOIN public.properties p ON p.id = i.property_id
     WHERE i.connect_partner_id IS DISTINCT FROM p.connect_partner_id`,
  );

  await check(
    "site visits whose partner stamp differs from their property (must be 0)",
    `SELECT count(*)::int AS n FROM public.site_visits sv
     JOIN public.properties p ON p.id = sv.property_id
     WHERE sv.connect_partner_id IS DISTINCT FROM p.connect_partner_id`,
  );

  await check(
    "lead activities on a property whose partner stamp differs (must be 0)",
    `SELECT count(*)::int AS n FROM public.crm_lead_activities a
     JOIN public.properties p ON p.id = a.property_id
     WHERE a.connect_partner_id IS DISTINCT FROM p.connect_partner_id`,
  );

  await check(
    "partner-stamped activities sitting on another partner's lead (must be 0)",
    `SELECT count(*)::int AS n FROM public.crm_lead_activities a
     JOIN public.crm_leads l ON l.id = a.lead_id
     WHERE a.connect_partner_id IS NOT NULL
       AND l.connect_partner_id IS DISTINCT FROM a.connect_partner_id`,
  );

  await check(
    "general activities visible on a partner-scoped lead (must be 0)",
    `SELECT count(*)::int AS n FROM public.crm_lead_activities a
     JOIN public.crm_leads l ON l.id = a.lead_id
     WHERE a.connect_partner_id IS NULL
       AND l.connect_partner_id IS NOT NULL
       AND a.activity_type NOT IN ('lead_assigned', 'lead_reassigned')`,
  );

  await check(
    "duplicate (buyer, partner) leads (must be 0)",
    `SELECT count(*)::int AS n FROM (
       SELECT buyer_id, connect_partner_id FROM public.crm_leads
       GROUP BY buyer_id, connect_partner_id HAVING count(*) > 1
     ) d`,
  );

  await check(
    "site visits linked to a lead of a different partner (must be 0)",
    `SELECT count(*)::int AS n FROM public.site_visits sv
     JOIN public.crm_leads l ON l.id = sv.lead_id
     WHERE sv.connect_partner_id IS NOT NULL
       AND l.connect_partner_id IS DISTINCT FROM sv.connect_partner_id`,
  );

  const { rows: dist } = await client.query(`
    SELECT cp.company_name,
           count(DISTINCT l.buyer_id)::int AS buyers,
           count(*)::int AS leads
    FROM public.crm_leads l
    JOIN public.connect_partners cp ON cp.id = l.connect_partner_id
    GROUP BY cp.company_name
    ORDER BY cp.company_name
  `);
  console.log("\n  Leads per partner (property-derived):");
  for (const r of dist) {
    console.log(`    ${r.company_name}: ${r.buyers} buyer(s), ${r.leads} lead(s)`);
  }

  const { rows: multi } = await client.query(`
    SELECT count(*)::int AS n FROM (
      SELECT buyer_id FROM public.crm_leads
      WHERE connect_partner_id IS NOT NULL
      GROUP BY buyer_id HAVING count(DISTINCT connect_partner_id) > 1
    ) m
  `);
  console.log(
    `\n  Buyers appearing in more than one partner dashboard: ${multi[0].n} (allowed by design)`,
  );

  console.log(failures === 0 ? "\nAll ownership checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
