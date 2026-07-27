#!/usr/bin/env node
/** Summarize .next/server JS sizes (proxy for Worker server graph). */
import { createGzip } from "node:zlib";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { readFileSync } from "node:fs";

const ROOT = process.cwd();
const SERVER = join(ROOT, ".next", "server");

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith(".js") && !name.endsWith(".map")) out.push({ path: full, size: st.size });
  }
  return out;
}

async function gzipSize(buf) {
  const chunks = [];
  const gzip = createGzip({ level: 9 });
  await pipeline(Readable.from(buf), gzip, async function* (source) {
    for await (const chunk of source) chunks.push(chunk);
  });
  return Buffer.concat(chunks).length;
}

function fmt(n) {
  return n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(2)} MiB` : `${(n / 1024).toFixed(1)} KiB`;
}

if (!existsSync(SERVER)) {
  console.error("Missing .next/server — run npm run build first");
  process.exit(1);
}

const files = walk(SERVER).sort((a, b) => b.size - a.size);
const total = files.reduce((s, f) => s + f.size, 0);

// Gzip of concatenated top server chunks (approx Worker payload proxy)
const top = files.slice(0, 80);
const concat = Buffer.concat(top.map((f) => readFileSync(f.path)));
const gz = await gzipSize(concat);

console.log("\nNext.js server bundle analysis (Worker graph proxy)\n");
console.log(`JS files: ${files.length}`);
console.log(`Raw total: ${fmt(total)}`);
console.log(`Gzip (top ${top.length} chunks concat): ${fmt(gz)}`);
console.log("\nLargest server JS:");
for (const f of files.slice(0, 25)) {
  console.log(`  ${fmt(f.size).padStart(10)}  ${relative(ROOT, f.path).replace(/\\/g, "/")}`);
}

const healthNft = join(SERVER, "app/api/system/health/route.js.nft.json");
if (existsSync(healthNft)) {
  const nft = JSON.parse(readFileSync(healthNft, "utf8"));
  console.log(`\nHealth route NFT files: ${nft.files?.length ?? 0}`);
}

console.log("");
