import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { runProductionHealthChecks } from "@/lib/system/health/runProductionHealthChecks";

export const dynamic = "force-dynamic";

/**
 * Developer Health Check API.
 * Always uses the Worker-safe (no filesystem) suite so NFT cannot pull
 * next.config / OpenNext / the repo into the Cloudflare Worker graph.
 *
 * Full local FS diagnostics: `npm run health:full`
 *
 * - development: open (local diagnostics before login)
 * - production: admin session required
 * Never returns secret values.
 */
export async function GET() {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const access = await requireAdminApiAccess();
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, ok: false },
        { status: access.status },
      );
    }
  }

  try {
    const report = await runProductionHealthChecks();

    return NextResponse.json(report, {
      status: report.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        score: 0,
        error: err instanceof Error ? err.message : "Health check failed",
      },
      { status: 500 },
    );
  }
}
