import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Minimal OpenNext Cloudflare config — no R2 cache required for size optimization.
 * Incremental cache can be added later via R2 binding without growing the Worker script.
 */
export default defineCloudflareConfig({});
