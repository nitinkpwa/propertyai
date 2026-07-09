/**
 * Checks Connect Partner schema in live Supabase (via PostgREST).
 * Usage: npm run db:check-connect-partners
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
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function tableOk(table) {
  const { error } = await sb.from(table).select("*").limit(0);
  if (!error) return true;
  const msg = error.message ?? "";
  return !msg.includes("Could not find the table") && !msg.includes("schema cache");
}

async function columnOk(table, column) {
  const { error } = await sb.from(table).select(column).limit(0);
  if (!error) return true;
  const msg = error.message ?? "";
  if (msg.includes("column") && msg.includes("does not exist")) return false;
  if (msg.includes("Could not find the table")) return false;
  return true;
}

console.log("=== Connect Partner Schema Check ===\n");

let failed = 0;

for (const table of ["connect_partners", "connect_partner_activities"]) {
  const ok = await tableOk(table);
  console.log(`${ok ? "✓" : "✗"} table public.${table}`);
  if (!ok) failed++;
}

for (const [table, col] of [
  ["profiles", "connect_partner_id"],
  ["properties", "assigned_connect_id"],
  ["properties", "connect_partner_id"],
  ["crm_leads", "assigned_connect_id"],
  ["crm_leads", "connect_partner_id"],
]) {
  const ok = await columnOk(table, col);
  console.log(`${ok ? "✓" : "✗"} column ${table}.${col}`);
  if (!ok) failed++;
}

for (const fn of ["is_admin", "get_user_connect_partner_id", "is_connect_partner_user"]) {
  const { error } = await sb.rpc(fn);
  const msg = error?.message ?? "";
  const ok = !msg.includes("Could not find the function");
  console.log(`${ok ? "✓" : "✗"} function public.${fn}()`);
  if (!ok) failed++;
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
