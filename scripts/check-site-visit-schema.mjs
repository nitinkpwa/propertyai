/**
 * Checks whether site visit + CRM tables exist in Supabase.
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
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const sb = createClient(url, key);
const tables = ["site_visits", "crm_leads", "crm_lead_activities", "crm_notifications"];
let allOk = true;

for (const table of tables) {
  const { error } = await sb.from(table).select("id").limit(1);
  const ok = !error;
  console.log(`${ok ? "✓" : "✗"} ${table}${error ? ` — ${error.message}` : ""}`);
  if (!ok) allOk = false;
}

process.exit(allOk ? 0 : 1);
