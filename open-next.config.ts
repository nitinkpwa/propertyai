import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";

/**
 * Production CPU mitigations for Error 1102:
 * - R2 incremental cache (binding NEXT_INC_CACHE_R2_BUCKET already in wrangler)
 * - Regional Cache API wrapper to skip expensive remote lookups on warm hits
 * - routePreloadingBehavior stays "none" (preloading increases cold-start CPU)
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    mode: "long-lived",
  }),
  routePreloadingBehavior: "none",
});
