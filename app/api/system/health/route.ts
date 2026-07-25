import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { runHealthChecks } from "@/lib/system/health/runHealthChecks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Developer Health Check API.
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
    const report = await runHealthChecks();
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
