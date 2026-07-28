# Cloudflare Workers + OpenNext deploy pipeline

Aligned with [@opennextjs/cloudflare 1.20.x](https://opennext.js.org/cloudflare/get-started) and the [Develop and Deploy](https://opennext.js.org/cloudflare/howtos/dev-deploy) guide.

## Why the previous pipeline failed

Cloudflare Workers Builds was configured as:

1. **Build:** `npm run build` → `next build` only → produces `.next/`
2. **Deploy:** `npx wrangler deploy` → detects OpenNext → calls `opennextjs-cloudflare deploy`

`opennextjs-cloudflare deploy` requires the **compiled OpenNext config** under `.open-next/.build/` (for example `open-next.config.mjs`). That file is created only by:

```bash
npx @opennextjs/cloudflare build
# same as: npx opennextjs-cloudflare build / npm run cf:build
```

`next build` alone never writes that artifact, so deploy fails with:

```text
Could not find compiled OpenNext config, did you run the build command?
```

A local `.open-next/` folder does not help CI: it is gitignored and must be produced on every Cloudflare build.

## What Cloudflare must execute

| Role | Command | Why |
|---|---|---|
| **Workers Builds → Build** | `npx @opennextjs/cloudflare build` (or `npm run cf:build`) | Runs `npm run build` (`next build`), then emits `.open-next/` including the compiled OpenNext config and `worker.js` |
| **Workers Builds → Deploy** | `npx @opennextjs/cloudflare deploy` | Official deploy path (populate remote cache + `wrangler deploy`) |

Do **not** use `npm run build` / `next build` as the Cloudflare Build command.

Do **not** set `"build": "opennextjs-cloudflare build"` in `package.json` — OpenNext invokes `npm run build` internally, which causes infinite recursion.

## Correct local / CI flow

```bash
# 1) OpenNext Cloudflare build (internally runs next build)
npm run cf:build
# or: npx @opennextjs/cloudflare build

# 2) Deploy (after .open-next exists)
npx wrangler deploy
# preferred official equivalent:
npx @opennextjs/cloudflare deploy
# or all-in-one:
npm run deploy
```

| Step | Command | Output |
|---|---|---|
| Next.js build (inner) | `npm run build` → `next build` | `.next/` |
| OpenNext adapt | `opennextjs-cloudflare build` | `.next/` + **`.open-next/`** (config, `worker.js`, assets) |
| Deploy | `opennextjs-cloudflare deploy` / `wrangler deploy` | Worker `propertyai` |

## package.json scripts (official shape)

| Script | Purpose |
|---|---|
| `npm run build` | **`next build` only** — required by OpenNext; do not change |
| `npm run cf:build` | `opennextjs-cloudflare build` (Cloudflare Build command helper) |
| `npm run preview` | OpenNext build + local Workers preview |
| `npm run deploy` | OpenNext build + deploy |
| `npm run upload` | OpenNext build + version upload (gradual deployments) |
| `npm run cf-typegen` | Generate `cloudflare-env.d.ts` |

## Cloudflare dashboard (Worker `propertyai`)

Settings → Builds:

| Setting | Required value |
|---|---|
| Production branch | `main` |
| **Build command** | **`npx @opennextjs/cloudflare build`** (or `npm run cf:build`) |
| **Deploy command** | **`npx @opennextjs/cloudflare deploy`** (or `npx wrangler deploy` after a successful OpenNext build) |
| Node version | **22** (via `.nvmrc` / `.node-version`) |

## Compatibility (repo)

| Package | Version |
|---|---|
| Node.js | **22 LTS** (`.nvmrc` / `.node-version` — Cloudflare Builds default is 22.x) |
| `next` | ^16.2.11 |
| `@opennextjs/cloudflare` | ^1.20.2 |
| `wrangler` | ^4.114.0 (`engines.node` ≥ 22) |

**Local Windows:** Node 24 can fail loading `@ast-grep/napi` (`ERR_DLOPEN_FAILED`). Use Node 22 LTS and install [VC++ Redistributable (x64)](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) if the `.node` binary still fails to load.

Worker name in `wrangler.jsonc` must remain **`propertyai`**.
