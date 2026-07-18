import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { generateMarketingCopy } from "@/lib/admin/property/studio/generateCopy";
import type { GenerateAction, GenerateRequest } from "@/lib/admin/property/studio/types";

const ACTIONS: GenerateAction[] = [
  "improve_description",
  "rewrite_seo",
  "whatsapp_ad",
  "facebook_ad",
  "google_ad",
  "social_caption",
  "reel_script",
  "video_narration",
];

export async function POST(req: NextRequest) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await req.json().catch(() => null)) as GenerateRequest | null;
  if (!body?.action || !body.form) {
    return NextResponse.json({ error: "action and form are required" }, { status: 400 });
  }
  if (!ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: "Unknown generate action" }, { status: 400 });
  }

  try {
    const result = await generateMarketingCopy(body.action, body.form);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/admin/properties/generate:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generate failed" },
      { status: 500 },
    );
  }
}
