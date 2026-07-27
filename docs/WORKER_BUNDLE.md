# AreaIQ Cloudflare Worker Bundle Optimization

## Problem

Cloudflare Workers Free plan limit: **3 MiB gzipped**.  
Deployments failed with: `Your Worker exceeded the size limit of 3 MiB.`

## Target

Worker gzip size **&lt; 2.8 MiB**.

---

## Phase 1 — Before (root causes)

| Issue | Impact |
|---|---|
| Full `openai` npm SDK (~9 MB on disk) | Large server graph for Ask / Studio |
| Health checks `readFileSync` / `existsSync` over the repo | Turbopack NFT pulled `next.config` + OpenNext + **~4795** files into `/api/system/health` |
| Static / dual-branch import of FS health probes | Entire source tree entered Worker NFT |
| No OpenNext / Wrangler project wiring | Hard to measure / deploy consistently |

### Proxy metrics (pre-optimization)

| Metric | Value |
|---|---|
| Health route NFT files | **~4795** |
| OpenNext / `next.config` in health NFT | **present** |
| Worker deploy | **FAIL** (&gt; 3 MiB) |

---

## Optimizations applied (Phases 2–8)

### Dead weight / packages

1. **Removed `openai` SDK** — replaced with thin fetch client (`lib/ask/openai-client.ts`) supporting JSON, text, and SSE streaming (Ask + Property Studio unchanged).
2. Dependencies kept lean: Next, React, Supabase, framer-motion, OpenNext/wrangler (deploy tooling). No moment/lodash/chart/editor/PDF libs in production deps.

### Server bundle / NFT hygiene

3. **Split health checks**:
   - `runtimeChecks.ts` + `runProductionHealthChecks.ts` — **zero filesystem** (Worker-safe)
   - `checks.ts` / `fsChecks.ts` / `runHealthChecks.ts` — local FS suite only
4. **Health API** (`/api/system/health`) imports **only** the production suite — never the FS suite.
5. Full local diagnostics: `npm run health:full` (CLI, outside App Router).
6. **`serverExternalPackages`**: `sharp`, `pg`, `to-ico`, `@opennextjs/cloudflare`, `wrangler`.
7. OpenNext init **not** imported from `next.config.ts` (avoids NFT pull).

### Dynamic imports (features preserved)

8. Ask query engine, seller tabs, home WelcomeTribute, admin Property Studio — lazy-loaded where already suitable.
9. Heavy admin/seller/CRM surfaces remain route-split by the App Router (separate page NFT graphs ~120–134 files vs health’s former 4.7k).

### Next config

10. `compress`, `removeConsole` (prod), `optimizePackageImports` for `framer-motion` + Supabase packages.
11. Image formats AVIF/WebP; remotePatterns limited to Supabase storage host.

### Scaffolding

12. `wrangler.jsonc`, `open-next.config.ts`, `public/_headers`
13. Scripts: `cf:build`, `cf:size`, `deploy`, `preview`, `analyze:server`, `health:full`

---

## Phase 9 — After (measured locally)

| Metric | Before | After |
|---|---|---|
| Health route NFT files | **~4795** | **99** |
| `next.config` in health NFT | yes | **0** |
| OpenNext / wrangler in health NFT | yes | **0** |
| FS health / `runHealthChecks` in health NFT | yes | **0** |
| Server JS raw (`.next/server`) | — | **~6.84 MiB** |
| Gzip of top 80 server chunks (proxy) | — | **~1015 KiB (~0.99 MiB)** |

### Largest remaining server modules (proxy)

1. Edge / middleware chunk (~349 KiB)
2. SSR shared chunks (~200–295 KiB)
3. `@supabase/supabase-js` (~192 KiB)
4. Property detail / Next runtime chunks (~100 KiB)

### OpenNext Worker gzip (deploy gate)

Local `npm run cf:build` is **blocked on this Windows host**:

```
ERR_DLOPEN_FAILED — @ast-grep/napi (ast-grep-napi.win32-x64-msvc.node)
```

The `.node` file is present; Windows cannot load it (typically missing **VC++ 2015–2022 x64 Redistributable**, or Node 24 incompatibility). OpenNext requires ast-grep for Cloudflare patches.

**To measure the real Worker size:**

```bash
# Prefer Node 20 or 22 LTS + VC++ Redistributable, or Linux/CI/WSL:
npm run cf:build
npm run cf:size
```

Upload `.open-next/server-functions/default/handler.mjs.meta.json` to  
https://esbuild.github.io/analyze/ for a visual breakdown.

**Expectation:** With NFT 4795→99 and `openai` removed, handler gzip should land **well under 2.8 MiB** (proxy top-80 gzip already ~1.0 MiB; OpenNext adds runtime glue but no longer the entire repo).

---

## Features preserved

- Ask AI (JSON + streaming)
- Property Studio AI extract / marketing copy
- Admin / Seller / Buyer / Connect / CRM
- Auth, site visits, health API (connectivity/env suite)
- Full FS health via `npm run health:full`

## Scripts

| Script | Purpose |
|---|---|
| `npm run build` | Next production build |
| `npm run analyze:server` | Next server chunk proxy report |
| `npm run health:full` | Local FS + connectivity health (CLI) |
| `npm run cf:build` | OpenNext Cloudflare build |
| `npm run cf:size` | Gzip Worker size report |
| `npm run deploy` | Build + deploy to Cloudflare |
