import "server-only";

import {
  checkCloudflareConfig,
  checkEnvVariables,
  checkNodeVersion,
  checkOpenAIConnectivity,
  checkPortAvailability,
  checkStorageBuckets,
  checkSupabaseConnectivity,
} from "./runtimeChecks";
import { buildHealthReport, type HealthReport } from "./types";

/** Production-safe health suite — no filesystem probes (Worker NFT safe). */
export async function runProductionHealthChecks(): Promise<HealthReport> {
  const sync = [
    checkEnvVariables(),
    checkCloudflareConfig(),
    checkPortAvailability(),
    checkNodeVersion(),
  ];

  const asyncChecks = await Promise.all([
    checkSupabaseConnectivity(),
    checkOpenAIConnectivity(),
    checkStorageBuckets(),
  ]);

  return buildHealthReport([...sync, ...asyncChecks]);
}
