/**
 * Audit: why Property Leads returns zero for a Connect partner.
 * Usage: node scripts/audit-patty-leads.mjs [companyName]
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const companyFilter = process.argv[2] ?? "Patty";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const projectRef = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function probeColumn(table, column) {
  const { error } = await sb.from(table).select(column).limit(0);
  if (!error) return true;
  return !(error.message?.includes("does not exist"));
}

const INTELLIGENCE_COLS = [
  "lead_score",
  "lead_temperature",
  "engagement_score",
  "conversion_probability",
  "follow_up_date",
  "next_action",
  "last_call_at",
  "last_whatsapp_at",
  "last_email_at",
];

console.log(`=== Patty / Property Leads Audit (filter: "${companyFilter}") ===\n`);

console.log("-- 1. Migration 20250708120000 columns on crm_leads --");
for (const col of INTELLIGENCE_COLS) {
  const ok = await probeColumn("crm_leads", col);
  console.log(`  crm_leads.${col}: ${ok ? "EXISTS" : "MISSING"}`);
}

console.log("\n-- 2. Connect partners matching filter --");
const { data: partners, error: pErr } = await sb
  .from("connect_partners")
  .select("id, company_name, profile_id, status")
  .ilike("company_name", `%${companyFilter}%`);

if (pErr) {
  console.error("Partner query error:", pErr.message);
  process.exit(1);
}

if (!partners?.length) {
  const { data: all } = await sb.from("connect_partners").select("id, company_name, status");
  console.log("  No match. All partners:");
  for (const p of all ?? []) console.log(`    - ${p.company_name} (${p.id}) [${p.status}]`);
  process.exit(0);
}

for (const partner of partners) {
  console.log(`\n=== Partner: ${partner.company_name} (${partner.id}) ===`);

  console.log("\n-- 3. crm_leads count (service role, no RLS) --");
  const { data: leads, error: lErr } = await sb
    .from("crm_leads")
    .select(
      "id, buyer_id, status, connect_partner_id, assigned_connect_id, primary_property_id, connect_assignment_source, created_at, updated_at",
    )
    .eq("connect_partner_id", partner.id);

  if (lErr) {
    console.error("  crm_leads error:", lErr.message);
  } else {
    console.log(`  Rows with connect_partner_id = partner: ${leads?.length ?? 0}`);
    for (const l of leads ?? []) {
      console.log(`    lead ${l.id.slice(0, 8)}… buyer=${l.buyer_id?.slice(0, 8)}… primary_property=${l.primary_property_id ?? "NULL"} assigned_connect=${l.assigned_connect_id?.slice(0, 8) ?? "NULL"}`);
    }
  }

  console.log("\n-- 4. Leads with assigned_connect_id = partner profile (legacy path) --");
  const { data: legacyLeads } = await sb
    .from("crm_leads")
    .select("id, buyer_id, connect_partner_id, assigned_connect_id, primary_property_id")
    .eq("assigned_connect_id", partner.profile_id);
  console.log(`  Rows: ${legacyLeads?.length ?? 0}`);
  for (const l of legacyLeads ?? []) {
    const mismatch = l.connect_partner_id && l.connect_partner_id !== partner.id;
    console.log(`    lead ${l.id.slice(0, 8)}… connect_partner_id=${l.connect_partner_id ?? "NULL"}${mismatch ? " MISMATCH" : ""}`);
  }

  console.log("\n-- 5. primary_property_id population --");
  const { count: withProp } = await sb
    .from("crm_leads")
    .select("id", { count: "exact", head: true })
    .eq("connect_partner_id", partner.id)
    .not("primary_property_id", "is", null);
  const { count: withoutProp } = await sb
    .from("crm_leads")
    .select("id", { count: "exact", head: true })
    .eq("connect_partner_id", partner.id)
    .is("primary_property_id", null);
  console.log(`  With primary_property_id: ${withProp ?? 0}`);
  console.log(`  Without primary_property_id: ${withoutProp ?? 0}`);

  console.log("\n-- 6. Properties assigned to partner --");
  const { data: props } = await sb
    .from("properties")
    .select("id, title, connect_partner_id")
    .eq("connect_partner_id", partner.id)
    .is("deleted_at", null);
  console.log(`  Properties: ${props?.length ?? 0}`);
  for (const p of props ?? []) console.log(`    ${p.title} (${p.id.slice(0, 8)}…)`);

  console.log("\n-- 7. Inquiries stamped with partner --");
  const { data: inqs } = await sb
    .from("inquiries")
    .select("id, from_user_id, property_id, connect_partner_id")
    .eq("connect_partner_id", partner.id);
  console.log(`  Inquiries: ${inqs?.length ?? 0}`);

  console.log("\n-- 8. Site visits stamped with partner --");
  const { data: visits } = await sb
    .from("site_visits")
    .select("id, user_id, property_id, connect_partner_id, lead_id")
    .eq("connect_partner_id", partner.id);
  console.log(`  Site visits: ${visits?.length ?? 0}`);

  console.log("\n-- 9. Simulate fetchPartnerBuyers SELECT (current app query) --");
  const newQuerySelect = `id, buyer_id, status, updated_at, primary_property_id, connect_assignment_source,
       lead_score, lead_temperature, engagement_score, conversion_probability,
       follow_up_date, next_action, last_call_at, last_whatsapp_at, last_email_at,
       buyer:profiles!crm_leads_buyer_id_fkey(id, full_name),
       property:properties!crm_leads_primary_property_id_fkey(id, title, city)`;
  const { data: newQuery, error: nqErr } = await sb
    .from("crm_leads")
    .select(newQuerySelect)
    .eq("connect_partner_id", partner.id);
  if (nqErr) {
    console.log(`  NEW QUERY FAILED: ${nqErr.message}`);
  } else {
    console.log(`  NEW QUERY returned: ${newQuery?.length ?? 0} rows`);
  }

  console.log("\n-- 10. Old query (pre-intelligence columns) --");
  const oldQuerySelect = `id, buyer_id, status, updated_at, primary_property_id, connect_assignment_source,
       buyer:profiles!crm_leads_buyer_id_fkey(id, full_name),
       property:properties!crm_leads_primary_property_id_fkey(id, title, city)`;
  const { data: oldQuery, error: oqErr } = await sb
    .from("crm_leads")
    .select(oldQuerySelect)
    .eq("connect_partner_id", partner.id);
  if (oqErr) {
    console.log(`  OLD QUERY FAILED: ${oqErr.message}`);
  } else {
    console.log(`  OLD QUERY returned: ${oldQuery?.length ?? 0} rows`);
    for (const r of oldQuery ?? []) {
      const buyer = Array.isArray(r.buyer) ? r.buyer[0] : r.buyer;
      const prop = Array.isArray(r.property) ? r.property[0] : r.property;
      console.log(`    ${buyer?.full_name ?? "Unknown"} — ${prop?.title ?? "no property"}`);
    }
  }

  if (partner.profile_id && dbPassword && projectRef) {
    console.log("\n-- 11. RLS check as partner user (direct SQL) --");
    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      const { rows: rlsRows } = await client.query(
        `SELECT count(*)::int AS n FROM public.crm_leads l
         WHERE l.connect_partner_id = $1
           AND (
             l.assigned_connect_id = $2
             OR l.connect_partner_id = (SELECT public.get_user_connect_partner_id())
           )`,
        [partner.id, partner.profile_id],
      );
      console.log(`  Leads visible via RLS expression (as postgres): ${rlsRows[0]?.n}`);
      const { rows: fnTest } = await client.query(
        `SELECT public.get_user_connect_partner_id() AS fn_null_without_auth`,
      );
      console.log(`  get_user_connect_partner_id() without auth context: ${fnTest[0]?.fn_null_without_auth ?? "NULL"}`);
    } finally {
      await client.end();
    }
  }
}

console.log("\n=== Audit complete ===");
