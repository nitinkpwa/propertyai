# Cloudflare Workers + OpenNext deploy pipeline

## Why builds failed

Cloudflare Workers Builds was effectively doing:

1. **Build:** `npm run build` → previously `next build` (creates `.next/` only)
2. **Deploy:** `npx wrangler deploy` → detects OpenNext → runs `opennextjs-cloudflare deploy`

OpenNext then errors:

```text
Could not find compiled OpenNext config, did you run the build command?
```

because **`.open-next/` was never generated**. Wrangler expects:

- `.open-next/worker.js` (`wrangler.jsonc` → `main`)
- `.open-next/assets` (`wrangler.jsonc` → `assets.directory`)
- compiled OpenNext config under `.open-next/`

## Correct pipeline

| Step | Command | Output |
|---|---|---|
| Build | `opennextjs-cloudflare build` (`npm run build`) | `.next/` + **`.open-next/`** |
| Deploy | `npx wrangler deploy` or `npm run deploy` | Uploads Worker `propertyai` |

## package.json scripts

| Script | Purpose |
|---|---|
| `npm run build` | **OpenNext Cloudflare build** (CI default) |
| `npm run build:next` | Plain `next build` only (local/debug) |
| `npm run cf:build` | Alias for OpenNext build |
| `npm run deploy` | OpenNext build + deploy |
| `npm run preview` | OpenNext build + local preview |

## Cloudflare dashboard (Worker `propertyai`)

Settings → Builds:

| Setting | Recommended value |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` **or** `npm run deploy` |

If Deploy is `npm run deploy`, OpenNext may build twice (harmless). Prefer:

- Build: `npm run build`
- Deploy: `npx wrangler deploy`

## Compatibility (repo)

| Package | Version |
|---|---|
| `next` | ^16.2.11 |
| `@opennextjs/cloudflare` | ^1.20.2 |
| `wrangler` | ^4.114.0 |

Worker name in `wrangler.jsonc` must remain **`propertyai`**.
