/**
 * Probes live Supabase schema via PostgREST + RPC.
 * Usage: node scripts/inspect-production-schema.mjs
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
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function probeTable(table) {
  const { error } = await sb.from(table).select("*").limit(0);
  if (!error) return { exists: true };
  const msg = error.message ?? "";
  if (msg.includes("Could not find the table") || msg.includes("schema cache")) {
    return { exists: false, error: msg };
  }
  return { exists: true, note: msg };
}

async function probeColumn(table, column) {
  const { error } = await sb.from(table).select(column).limit(0);
  if (!error) return { exists: true };
  const msg = error.message ?? "";
  if (msg.includes("does not exist")) return { exists: false, error: msg };
  if (msg.includes("Could not find the table")) return { exists: false, tableMissing: true, error: msg };
  return { exists: true, note: msg };
}

async function probeRpc(fn) {
  const { error } = await sb.rpc(fn);
  const msg = error?.message ?? "";
  if (msg.includes("Could not find the function")) return { exists: false };
  return { exists: true, note: msg || "ok" };
}

async function sampleProfiles() {
  const { data, error } = await sb.from("profiles").select("id, role, full_name, email, phone").limit(5);
  if (error) return { error: error.message };
  const { count } = await sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "builder");
  return { sample: data, builderCount: count };
}

const tables = [
  "connect_partners",
  "connect_partner_activities",
  "profiles",
  "properties",
  "crm_leads",
  "inquiries",
  "site_visits",
];

const columns = [
  ["profiles", "connect_partner_id"],
  ["profiles", "full_name"],
  ["profiles", "email"],
  ["profiles", "phone"],
  ["profiles", "role"],
  ["profiles", "company"],
  ["properties", "assigned_connect_id"],
  ["properties", "connect_partner_id"],
  ["properties", "seller_id"],
  ["properties", "deleted_at"],
  ["crm_leads", "assigned_connect_id"],
  ["crm_leads", "connect_partner_id"],
  ["crm_leads", "buyer_id"],
];

const functions = [
  "is_admin",
  "get_user_connect_partner_id",
  "is_connect_partner_user",
  "is_connect_assigned_to_lead",
];

console.log("=== Production Schema Inspection ===");
console.log("Project:", url, "\n");

console.log("-- Tables --");
for (const t of tables) {
  const r = await probeTable(t);
  console.log(`  ${t}: ${r.exists ? "EXISTS" : "MISSING"}${r.error ? ` (${r.error})` : ""}`);
}

console.log("\n-- Columns --");
for (const [t, c] of columns) {
  const r = await probeColumn(t, c);
  console.log(`  ${t}.${c}: ${r.exists ? "EXISTS" : "MISSING"}${r.tableMissing ? " (table missing)" : ""}`);
}

console.log("\n-- Functions --");
for (const fn of functions) {
  const r = await probeRpc(fn);
  console.log(`  ${fn}(): ${r.exists ? "EXISTS" : "MISSING"}`);
}

console.log("\n-- Profiles sample --");
const prof = await sampleProfiles();
console.log(JSON.stringify(prof, null, 2));
