# Cloudflare Workers + OpenNext deploy pipeline

## Why builds failed (compiled OpenNext config)

Cloudflare Workers Builds was effectively doing:

1. **Build:** `npm run build` → `next build` only → `.next/` (no `.open-next/`)
2. **Deploy:** `npx wrangler deploy` → detects OpenNext → `opennextjs-cloudflare deploy`

OpenNext then errors:

```text
Could not find compiled OpenNext config, did you run the build command?
```

`opennextjs-cloudflare build` is required. It runs `npm run build` (**must stay `next build`**) and then writes `.open-next/`.

Do **not** set `"build": "opennextjs-cloudflare build"` — that causes infinite recursion because OpenNext itself invokes `npm run build`.

## Correct pipeline

| Step | Command | Output |
|---|---|---|
| Build | `npm run cf:build` / `npx opennextjs-cloudflare build` | `.next/` + **`.open-next/`** |
| Deploy | `npx wrangler deploy` | Uploads Worker `propertyai` |

## package.json scripts

| Script | Purpose |
|---|---|
| `npm run build` | **`next build` only** (invoked by OpenNext) |
| `npm run build:worker` / `npm run cf:build` | OpenNext Cloudflare build |
| `npm run deploy` | OpenNext build + deploy |
| `npm run preview` | OpenNext build + local preview |

## Cloudflare dashboard (Worker `propertyai`)

Settings → Builds:

| Setting | Required value |
|---|---|
| Production branch | `main` |
| **Build command** | **`npm run cf:build`** (or `npx opennextjs-cloudflare build`) |
| Deploy command | `npx wrangler deploy` |
| Node version | **22** (via `.nvmrc` / `.node-version`) |

## Compatibility (repo)

| Package | Version |
|---|---|
| Node.js | **22 LTS** (`.nvmrc` / `.node-version` — Cloudflare Builds default is 22.x) |
| `next` | ^16.2.11 (`engines`: ≥20.9) |
| `@opennextjs/cloudflare` | ^1.20.2 |
| `wrangler` | ^4.114.0 (`engines.node` ≥ 22) |
| `@ast-grep/napi` | (OpenNext transitive) — needs Node 22 + MSVC runtime on Windows |

**Local Windows:** Node 24 can fail loading `@ast-grep/napi` (`ERR_DLOPEN_FAILED`). Use Node 22 LTS and install [VC++ Redistributable (x64)](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) if the `.node` binary still fails to load.

Worker name in `wrangler.jsonc` must remain **`propertyai`**.
