import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getDefaultWeights,
  type ScoreWeightKind,
} from "@/lib/scoring/weights-store";
import { mergeWeights } from "@/lib/scoring/weights";

const KINDS: ScoreWeightKind[] = [
  "areaiq",
  "investment",
  "legal",
  "builder",
  "location",
];

function isKind(v: unknown): v is ScoreWeightKind {
  return typeof v === "string" && (KINDS as string[]).includes(v);
}

/** GET ?kind=areaiq — active weights (defaults if none) */
export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const kindParam = req.nextUrl.searchParams.get("kind");
  const kind: ScoreWeightKind = isKind(kindParam) ? kindParam : "areaiq";
  const defaults = getDefaultWeights(kind);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("scoring_weights")
      .select("id, kind, label, weights, is_active, updated_at, updated_by, notes")
      .eq("kind", kind)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Table may not exist yet — return code defaults
      return NextResponse.json({
        ok: true,
        kind,
        id: null,
        weights: defaults,
        source: "defaults",
      });
    }

    if (!data?.weights) {
      return NextResponse.json({
        ok: true,
        kind,
        id: null,
        weights: defaults,
        source: "defaults",
      });
    }

    return NextResponse.json({
      ok: true,
      kind,
      id: data.id,
      label: data.label,
      weights: mergeWeights(defaults, data.weights as Record<string, number>),
      source: "database",
      updatedAt: data.updated_at,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      kind,
      id: null,
      weights: defaults,
      source: "defaults",
    });
  }
}

/** PUT — save & optionally activate a weight config */
export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    kind?: string;
    weights?: Record<string, number>;
    label?: string;
    activate?: boolean;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isKind(body.kind) || !body.weights || typeof body.weights !== "object") {
    return NextResponse.json(
      { error: "kind and weights are required" },
      { status: 400 },
    );
  }

  const kind = body.kind;
  const weights = mergeWeights(getDefaultWeights(kind), body.weights);
  const activate = body.activate !== false;

  try {
    const supabase = await createSupabaseServerClient();

    if (activate) {
      await supabase
        .from("scoring_weights")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("kind", kind)
        .eq("is_active", true);
    }

    const { data, error } = await supabase
      .from("scoring_weights")
      .insert({
        kind,
        label: body.label?.trim() || `Admin override · ${kind}`,
        weights,
        is_active: activate,
        notes: body.notes ?? null,
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error.message.includes("scoring_weights")
              ? "scoring_weights table missing — run migration 20260731120000_property_scoring_engine.sql"
              : error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, id: data.id, kind, weights });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to save weights",
      },
      { status: 500 },
    );
  }
}
