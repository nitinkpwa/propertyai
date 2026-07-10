import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const exts = new Set([".tsx", ".ts"]);
const skipDirs = new Set(["node_modules", ".next", ".git", "scripts"]);

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (exts.has(path.extname(ent.name))) files.push(p);
  }
  return files;
}

const replacements = [
  [/placeholder:text-neutral-400/g, "placeholder:text-placeholder"],
  [/placeholder:text-gray-400/g, "placeholder:text-placeholder"],
  [/placeholder:text-neutral-500/g, "placeholder:text-placeholder"],
  [
    /text-xs font-semibold uppercase tracking-wider text-neutral-400/g,
    "text-xs font-semibold uppercase tracking-wider text-label",
  ],
  [
    /text-xs font-semibold uppercase tracking-wide text-neutral-500/g,
    "text-xs font-semibold uppercase tracking-wide text-label",
  ],
  [
    /text-xs font-semibold uppercase tracking-wider text-neutral-500/g,
    "text-xs font-semibold uppercase tracking-wider text-label",
  ],
  [
    /text-\[10px\] font-semibold uppercase tracking-wider text-neutral-400/g,
    "text-[10px] font-semibold uppercase tracking-wider text-label",
  ],
  [
    /text-\[10px\] font-semibold uppercase tracking-wider text-neutral-500/g,
    "text-[10px] font-semibold uppercase tracking-wider text-label",
  ],
  [/text-xs font-medium text-neutral-500/g, "text-xs font-medium text-label"],
  [/text-sm font-medium text-neutral-700/g, "text-sm font-medium text-label"],
  [/text-neutral-900/g, "text-heading-primary"],
  [/text-neutral-800/g, "text-heading-secondary"],
  [/text-neutral-700/g, "text-body"],
  [/text-neutral-600/g, "text-body"],
  [/text-neutral-500/g, "text-muted"],
  [/text-neutral-400/g, "text-muted"],
  [/text-neutral-300/g, "text-muted"],
  [/text-gray-900/g, "text-input"],
  [/text-gray-800/g, "text-heading-secondary"],
  [/text-gray-700/g, "text-body"],
  [/text-gray-600/g, "text-body"],
  [/text-gray-500/g, "text-muted"],
  [/text-gray-400/g, "text-placeholder"],
  [/text-gray-300/g, "text-muted"],
  [/text-slate-500/g, "text-muted"],
  [/text-slate-400/g, "text-muted"],
  [/text-slate-300/g, "text-muted"],
  [/text-slate-200/g, "text-muted"],
];

let changed = 0;
for (const file of walk(root)) {
  if (file.includes("lib/design/text.ts")) continue;
  let content = fs.readFileSync(file, "utf8");
  const orig = content;
  for (const [re, rep] of replacements) content = content.replace(re, rep);
  if (content !== orig) {
    fs.writeFileSync(file, content);
    changed++;
  }
}
console.log(`Updated ${changed} files`);
