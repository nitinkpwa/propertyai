#!/usr/bin/env node
/**
 * Measure Cloudflare Worker upload / gzip size after `npm run cf:build`.
 */
import { createGzip } from "node:zlib";
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = process.cwd();
const OPEN_NEXT = join(ROOT, ".open-next");
const LIMIT_FREE_MIB = 3;
const TARGET_MIB = 2.8;

async function gzipSize(buf) {
  const chunks = [];
  const gzip = createGzip({ level: 9 });
  await pipeline(Readable.from(buf), gzip, async function* (source) {
    for await (const chunk of source) chunks.push(chunk);
  });
  return Buffer.concat(chunks).length;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push({ path: full, size: st.size });
  }
  return out;
}

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

if (!existsSync(OPEN_NEXT)) {
  console.error("Missing .open-next — run: npm run cf:build");
  process.exit(1);
}

const workerJs = join(OPEN_NEXT, "worker.js");
const handlerDir = join(OPEN_NEXT, "server-functions", "default");
const handlerMjs = join(handlerDir, "handler.mjs");
const middleware = join(OPEN_NEXT, "middleware", "handler.mjs");

const candidates = [
  { label: "worker.js", path: workerJs },
  { label: "handler.mjs", path: handlerMjs },
  { label: "middleware/handler.mjs", path: middleware },
].filter((c) => existsSync(c.path));

console.log("\nAreaIQ Cloudflare Worker Bundle Report\n");

let totalRaw = 0;
let totalGzip = 0;

for (const c of candidates) {
  const buf = readFileSync(c.path);
  const gz = await gzipSize(buf);
  totalRaw += buf.length;
  totalGzip += gz;
  console.log(`${c.label}`);
  console.log(`  raw:  ${fmt(buf.length)}`);
  console.log(`  gzip: ${fmt(gz)}`);
}

// Approximate wrangler "Total Upload" = worker + bundled server chunks under .open-next
const all = walk(OPEN_NEXT).filter(
  (f) =>
    f.path.endsWith(".js") ||
    f.path.endsWith(".mjs") ||
    f.path.endsWith(".cjs") ||
    f.path.endsWith(".wasm"),
);

all.sort((a, b) => b.size - a.size);
console.log("\nLargest Worker artifacts:");
for (const f of all.slice(0, 20)) {
  const rel = relative(ROOT, f.path).replace(/\\/g, "/");
  console.log(`  ${fmt(f.size).padStart(10)}  ${rel}`);
}

const handlerGz = existsSync(handlerMjs)
  ? await gzipSize(readFileSync(handlerMjs))
  : totalGzip;

const handlerMiB = handlerGz / (1024 * 1024);
const freeLimit = LIMIT_FREE_MIB;
const target = TARGET_MIB;

console.log("\n---");
console.log(`Primary Worker (handler gzip): ${fmt(handlerGz)}`);
console.log(`Free plan limit:               ${freeLimit.toFixed(2)} MiB`);
console.log(`Sprint target:                 ${target.toFixed(2)} MiB`);
console.log(
  handlerMiB < target
    ? `STATUS: PASS (under ${target} MiB target)`
    : handlerMiB < freeLimit
      ? `STATUS: PASS free plan (over ${target} MiB target)`
      : `STATUS: FAIL — exceeds ${freeLimit} MiB free plan`,
);

const meta = join(handlerDir, "handler.mjs.meta.json");
if (existsSync(meta)) {
  console.log(`\nBundle analyzer input: ${relative(ROOT, meta)}`);
  console.log("Upload to https://esbuild.github.io/analyze/ for visual breakdown.");
}

console.log("");
process.exit(handlerMiB < freeLimit ? 0 : 1);
