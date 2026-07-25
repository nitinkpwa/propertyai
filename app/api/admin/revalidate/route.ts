import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";

/** Bust public listing/detail caches after admin property mutations. */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let propertyId: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.propertyId === "string") propertyId = body.propertyId;
  } catch {
    /* optional body */
  }

  revalidatePath("/properties");
  revalidatePath("/");
  if (propertyId) {
    revalidatePath(`/property/${propertyId}`);
  }

  return NextResponse.json({ ok: true });
}
