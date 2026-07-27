/**
 * Full local health suite (includes filesystem probes).
 * Kept out of the App Router so Cloudflare Worker NFT stays lean.
 *
 * Usage: npm run health:full
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

function loadEnvFile(name) {
  const path = join(root, name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const modUrl = pathToFileURL(
  join(root, "lib/system/health/runHealthChecks.ts"),
).href;

const { runHealthChecks } = await import(modUrl);
const report = await runHealthChecks();

console.log(JSON.stringify(report, null, 2));
console.log(
  `\nScore: ${report.score}/100  ok=${report.ok}  checks=${report.summary.total}`,
);
process.exit(report.ok ? 0 : 1);
