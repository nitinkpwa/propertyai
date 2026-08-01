/**
 * Diagnoses site-visit booking schema + RLS readiness.
 * Usage: node scripts/diagnose-site-visit.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("=== Site Visit Diagnosis ===");
console.log("URL set:", Boolean(url));
console.log("ANON set:", Boolean(anon), anon ? `(len=${anon.length})` : "");
console.log(
  "SERVICE_ROLE set:",
  Boolean(service),
  service ? `(len=${service.length})` : "",
);

if (!url || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or ANON key");
  process.exit(1);
}

const sb = createClient(url, service || anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [
  ["site_visits", "id, user_id, property_id, visit_date, visit_time, status, purpose, checklist, lead_id, inquiry_id, connect_partner_id, builder_name"],
  ["crm_leads", "id, buyer_id, status, connect_partner_id"],
  ["crm_lead_activities", "id, lead_id, activity_type"],
  ["crm_notifications", "id, user_id, type"],
  ["inquiries", "id, from_user_id, property_id, seller_id"],
  ["properties", "id, title, seller_id, status, site_visit_enabled, connect_partner_id"],
];

let failed = 0;
for (const [table, cols] of checks) {
  const { error } = await sb.from(table).select(cols).limit(1);
  if (error) {
    failed++;
    console.log(`✗ ${table}: ${error.message} (code=${error.code ?? "?"})`);
    // retry minimal
    const { error: e2 } = await sb.from(table).select("id").limit(1);
    if (e2) console.log(`  minimal select also failed: ${e2.message}`);
    else console.log("  minimal select ok — some columns missing");
  } else {
    console.log(`✓ ${table}`);
  }
}

// Probe active property for booking
const { data: props, error: propErr } = await sb
  .from("properties")
  .select("id, title, seller_id, status, site_visit_enabled")
  .eq("status", "active")
  .is("deleted_at", null)
  .limit(3);

if (propErr) {
  console.log("✗ active property probe:", propErr.message);
  failed++;
} else {
  console.log(`✓ active properties sample: ${props?.length ?? 0}`);
  for (const p of props ?? []) {
    console.log(
      `  - ${p.id} | ${p.title} | seller=${p.seller_id ? "yes" : "NO"} | site_visit_enabled=${p.site_visit_enabled}`,
    );
  }
}

// Recent site visits
const { data: visits, error: visitErr } = await sb
  .from("site_visits")
  .select("id, status, visit_date, property_id, created_at")
  .order("created_at", { ascending: false })
  .limit(5);

if (visitErr) {
  console.log("✗ recent visits:", visitErr.message);
} else {
  console.log(`✓ recent visits: ${visits?.length ?? 0}`);
  for (const v of visits ?? []) {
    console.log(`  - ${v.id} | ${v.status} | ${v.visit_date} | ${v.created_at}`);
  }
}

process.exit(failed ? 1 : 0);
