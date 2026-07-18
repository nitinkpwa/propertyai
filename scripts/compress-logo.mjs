/**
 * Compress public/logo.png for faster LCP/navbar loads.
 * Usage: node scripts/compress-logo.mjs
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const input = resolve(root, "public/logo.png");

const before = statSync(input).size;
const sharp = (await import("sharp")).default;

const png = await sharp(input)
  .resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
  .png({ quality: 80, compressionLevel: 9, effort: 10 })
  .toBuffer();

writeFileSync(input, png);

const webpPath = resolve(root, "public/logo.webp");
await sharp(input).webp({ quality: 82 }).toFile(webpPath);

const after = statSync(input).size;
console.log(
  `logo.png: ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB`,
);
console.log(`logo.webp: ${(statSync(webpPath).size / 1024).toFixed(1)} KB`);
