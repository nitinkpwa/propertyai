import "server-only";

import {
  checkApiRoutes,
  checkBuildRuntimeMismatch,
  checkCloudflareConfig,
  checkDatabaseMigrations,
  checkDuplicateEnvKeys,
  checkEnvVariables,
  checkMiddlewareProxy,
  checkNextCache,
  checkNextConfig,
  checkNodeVersion,
  checkNpmPackages,
  checkOpenAIConnectivity,
  checkPortAvailability,
  checkStorageBuckets,
  checkSupabaseConnectivity,
} from "./checks";
import { buildHealthReport, type HealthReport } from "./types";

/** Run the full Developer Health Check suite (server-only). */
export async function runHealthChecks(): Promise<HealthReport> {
  const sync = [
    checkEnvVariables(),
    checkDuplicateEnvKeys(),
    checkCloudflareConfig(),
    checkPortAvailability(),
    checkNextCache(),
    checkNodeVersion(),
    checkNpmPackages(),
    checkMiddlewareProxy(),
    checkApiRoutes(),
    checkNextConfig(),
    checkBuildRuntimeMismatch(),
  ];

  const asyncChecks = await Promise.all([
    checkSupabaseConnectivity(),
    checkOpenAIConnectivity(),
    checkDatabaseMigrations(),
    checkStorageBuckets(),
  ]);

  return buildHealthReport([...sync, ...asyncChecks]);
}
