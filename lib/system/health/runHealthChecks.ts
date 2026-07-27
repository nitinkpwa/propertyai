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
import { buildHealthReport, type HealthCheckResult, type HealthReport } from "./types";

/**
 * Full suite for local development (includes filesystem probes).
 * Not imported by any App Router route — keeps the Worker NFT graph lean.
 * Run via: `npm run health:full`
 */
export async function runHealthChecks(): Promise<HealthReport> {
  const sync: HealthCheckResult[] = [
    checkEnvVariables(),
    checkCloudflareConfig(),
    checkPortAvailability(),
    checkNodeVersion(),
  ];

  const fs = await import("./fsChecks");
  sync.push(
    fs.checkDuplicateEnvKeys(),
    fs.checkNextCache(),
    fs.checkNpmPackages(),
    fs.checkMiddlewareProxy(),
    fs.checkApiRoutes(),
    fs.checkNextConfig(),
    fs.checkBuildRuntimeMismatch(),
  );

  const asyncChecks = await Promise.all([
    checkSupabaseConnectivity(),
    checkOpenAIConnectivity(),
    checkStorageBuckets(),
    fs.checkDatabaseMigrations(),
  ]);

  return buildHealthReport([...sync, ...asyncChecks]);
}
