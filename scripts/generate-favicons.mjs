/**
 * Generates AreaIQ favicon assets from public/logo.png (official header logo).
 * Run: node scripts/generate-favicons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const logoPath = path.join(root, "public", "logo.png");
const outDir = path.join(root, "public");

/** Crop the map-pin mark from the full wordmark logo (2000×2000 source). */
async function extractBrandIcon() {
  const { width, height } = await sharp(logoPath).metadata();
  const size = Math.round(Math.min(width, height) * 0.58);
  const left = Math.round((width - size) / 2);
  const top = Math.round(height * 0.04);
  return sharp(logoPath)
    .extract({ left, top, width: size, height: size })
    .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
}

async function writePng(buffer, filename, size) {
  const out = path.join(outDir, filename);
  await sharp(buffer).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log(`  ✓ ${filename} (${size}×${size})`);
}

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error("Missing public/logo.png");
    process.exit(1);
  }

  console.log("Extracting AreaIQ icon from public/logo.png …");
  const icon = await extractBrandIcon();

  await writePng(icon, "favicon-16x16.png", 16);
  await writePng(icon, "favicon-32x32.png", 32);
  await writePng(icon, "apple-touch-icon.png", 180);
  await writePng(icon, "android-chrome-192x192.png", 192);
  await writePng(icon, "android-chrome-512x512.png", 512);

  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(
    icoSizes.map((s) => sharp(icon).resize(s, s).png().toBuffer()),
  );
  const ico = await toIco(icoBuffers);
  fs.writeFileSync(path.join(outDir, "favicon.ico"), ico);
  console.log(`  ✓ favicon.ico (${icoSizes.join(", ")}px)`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
