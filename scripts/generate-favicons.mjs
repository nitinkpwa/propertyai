/**
 * Generates AreaIQ favicon assets from public/favicon.png (uploaded brand icon).
 * Falls back to extracting a mark from public/logo.png if favicon.png is missing.
 * Run: npm run icons:generate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const appDir = path.join(root, "app");
const faviconPngPath = path.join(publicDir, "favicon.png");
const logoPath = path.join(publicDir, "logo.png");

/** Prefer the uploaded favicon; otherwise crop the map-pin mark from the wordmark. */
async function loadBrandIcon() {
  if (fs.existsSync(faviconPngPath)) {
    console.log("Using public/favicon.png as source …");
    return sharp(faviconPngPath)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  }

  if (!fs.existsSync(logoPath)) {
    console.error("Missing public/favicon.png and public/logo.png");
    process.exit(1);
  }

  console.log("favicon.png missing — extracting mark from public/logo.png …");
  const { width, height } = await sharp(logoPath).metadata();
  const size = Math.round(Math.min(width, height) * 0.58);
  const left = Math.round((width - size) / 2);
  const top = Math.round(height * 0.04);
  return sharp(logoPath)
    .extract({ left, top, width: size, height: size })
    .resize(512, 512, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function writePng(buffer, dir, filename, size) {
  const out = path.join(dir, filename);
  await sharp(buffer).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log(`  ✓ ${path.relative(root, out)} (${size}×${size})`);
}

async function main() {
  const icon = await loadBrandIcon();

  await writePng(icon, publicDir, "favicon-16x16.png", 16);
  await writePng(icon, publicDir, "favicon-32x32.png", 32);
  await writePng(icon, publicDir, "apple-touch-icon.png", 180);
  await writePng(icon, publicDir, "android-chrome-192x192.png", 192);
  await writePng(icon, publicDir, "android-chrome-512x512.png", 512);

  // Keep a clean square master PNG alongside the uploaded source
  await writePng(icon, publicDir, "favicon-512.png", 512);

  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(
    icoSizes.map((s) => sharp(icon).resize(s, s).png().toBuffer()),
  );
  const ico = await toIco(icoBuffers);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), ico);
  console.log(`  ✓ public/favicon.ico (${icoSizes.join(", ")}px)`);

  // Next.js App Router file-based metadata icons
  fs.writeFileSync(path.join(appDir, "favicon.ico"), ico);
  console.log("  ✓ app/favicon.ico");
  await writePng(icon, appDir, "icon.png", 512);
  await writePng(icon, appDir, "apple-icon.png", 180);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
