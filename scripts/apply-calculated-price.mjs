import pg from "pg";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);

const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const host = `db.${url.hostname.replace(/^www\./, "")}`;
// Supabase pooler / direct: try project ref from URL
const projectRef = url.hostname.split(".")[0];
const password = env.SUPABASE_DB_PASSWORD;

const candidates = [
  {
    label: "direct",
    connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
  },
  {
    label: "pooler",
    connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
  },
];

const sql = readFileSync(
  "supabase/migrations/20250720140000_properties_calculated_price.sql",
  "utf8",
);

let lastError = null;
for (const c of candidates) {
  const client = new pg.Client({
    connectionString: c.connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query(sql);
    const check = await client.query(
      `select column_name from information_schema.columns
       where table_schema='public' and table_name='properties' and column_name='calculated_price'`,
    );
    console.log(JSON.stringify({ ok: true, via: c.label, column: check.rows }, null, 2));
    await client.end();
    process.exit(0);
  } catch (e) {
    lastError = { via: c.label, message: e.message };
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

console.error(JSON.stringify({ ok: false, lastError }, null, 2));
process.exit(1);
