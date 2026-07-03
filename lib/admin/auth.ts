import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

type AdminAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

export async function requireAdminApiAccess(): Promise<AdminAccessResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (actor?.role !== "admin") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, userId: user.id };
}
