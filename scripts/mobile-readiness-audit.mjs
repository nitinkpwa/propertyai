#!/usr/bin/env node
/**
 * AreaIQ Mobile Readiness Audit
 * Scans source for layout-engine violations (magic offsets, raw z-index, !important).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "lib"];
const EXT = new Set([".ts", ".tsx", ".css"]);

const ALLOW_PATHS = [
  "lib/layout/",
  "components/layout/engine/",
  "scripts/",
  "app/globals.css", // defines z-layout-* and chrome vars
];

const RULES = [
  {
    id: "raw-z-index",
    severity: "high",
    pattern: /\bz-\[(\d+)\]\b/g,
    message: "Raw z-[N] — use z-layout-* / lib/layout/zIndex.ts",
  },
  {
    id: "magic-bottom-calc",
    severity: "high",
    pattern: /bottom-\[calc\(/g,
    message: "Magic bottom calc — use bottom-chrome / --chrome-bottom",
  },
  {
    id: "hardcoded-pt-16",
    severity: "high",
    pattern: /\bpt-16\b/g,
    message: "Hardcoded pt-16 — use pt-layout / --chrome-top",
  },
  {
    id: "hardcoded-top-16",
    severity: "high",
    pattern: /\btop-16\b/g,
    message: "Hardcoded top-16 — use top-chrome / sticky-below-nav",
  },
  {
    id: "raw-safe-area-env",
    severity: "medium",
    pattern: /env\(safe-area-inset-/g,
    message: "Raw env(safe-area-inset-*) — use --safe-* / pt-safe / pb-safe",
  },
  {
    id: "important",
    severity: "high",
    pattern: /!important\b/g,
    message: "Banned !important",
  },
  {
    id: "important-tailwind",
    severity: "medium",
    // Match Tailwind important prefixes in class strings, not JS bang-negation
    pattern: /(?:^|[\s"'`])!(?:w-|h-|min-h-|p-|m-|flex|hidden|block|text-|bg-|border-|shadow-|ring-)/g,
    message: "Tailwind !important utility — prefer layout tokens",
  },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".next") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if ([...EXT].some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

function isAllowed(rel) {
  return ALLOW_PATHS.some((p) => rel.replace(/\\/g, "/").includes(p));
}

const findings = [];

for (const dir of SCAN_DIRS) {
  const files = walk(join(ROOT, dir));
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (isAllowed(rel)) continue;
    const src = readFileSync(file, "utf8");
    for (const rule of RULES) {
      // Engine CSS may define vars; skip globals for safe-area definition
      if (rule.id === "raw-safe-area-env" && rel === "app/globals.css") continue;
      if (rule.id === "important" && rel.endsWith(".css")) {
        // still ban !important in CSS outside allowlist
      }
      // Tailwind important utilities only appear in class strings (tsx/css)
      if (rule.id === "important-tailwind" && !rel.endsWith(".tsx") && !rel.endsWith(".css")) {
        continue;
      }
      const re = new RegExp(rule.pattern.source, rule.pattern.flags);
      let m;
      while ((m = re.exec(src))) {
        const line = src.slice(0, m.index).split("\n").length;
        // Ignore JS logical negation like `!hidden &&`
        if (rule.id === "important-tailwind") {
          const after = src.slice(m.index + m[0].length, m.index + m[0].length + 3);
          if (/^\s*(&&|\|\||\?|:|;|,|\))/.test(after) || after.startsWith(" &&")) continue;
        }
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          message: rule.message,
          file: rel,
          line,
          match: m[0].trim(),
        });
      }
    }
  }
}

const high = findings.filter((f) => f.severity === "high");
const medium = findings.filter((f) => f.severity === "medium");

console.log("\nAreaIQ Mobile Readiness Audit\n");
console.log(`Files scanned under: ${SCAN_DIRS.join(", ")}`);
console.log(`Findings: ${findings.length} (high: ${high.length}, medium: ${medium.length})\n`);

const byRule = {};
for (const f of findings) {
  byRule[f.rule] = (byRule[f.rule] || 0) + 1;
}
for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${rule}: ${count}`);
}

if (findings.length) {
  console.log("\nSample (up to 40):");
  for (const f of findings.slice(0, 40)) {
    console.log(`  [${f.severity}] ${f.file}:${f.line}  ${f.match}  — ${f.message}`);
  }
  if (findings.length > 40) console.log(`  … +${findings.length - 40} more`);
}

// Score: start 100, -2 high, -0.5 medium (floor 0)
const score = Math.max(
  0,
  Math.round(100 - high.length * 2 - medium.length * 0.5),
);

console.log(`\nAudit score (static): ${score}/100`);
console.log(
  high.length === 0
    ? "PASS: 0 high-severity layout violations\n"
    : "FAIL: high-severity layout violations remain\n",
);

process.exit(high.length > 0 ? 1 : 0);
