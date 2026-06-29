import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { normalizeMobileNumber } from "@/lib/auth/mobile";
import { getDashboardPath } from "@/lib/auth/profile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/buyer";

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const fullName =
    (data.user.user_metadata?.full_name as string | undefined) ??
    data.user.email?.split("@")[0] ??
    "User";

  const role =
    (data.user.user_metadata?.role as
      | "buyer"
      | "seller"
      | "broker"
      | "builder"
      | undefined) ?? "buyer";

  const phone = data.user.user_metadata?.phone
    ? normalizeMobileNumber(String(data.user.user_metadata.phone))
    : data.user.email?.endsWith("@areaiq.app")
      ? normalizeMobileNumber(data.user.email.split("@")[0] ?? "")
      : "";

  const { data: profile } = await supabase
    .from("profiles")
    .upsert(
      {
        id: data.user.id,
        email: data.user.email ?? "",
        full_name: fullName,
        phone,
        role,
      },
      { onConflict: "id" },
    )
    .select("role")
    .single();

  const destination = next.startsWith("/")
    ? next
    : getDashboardPath(profile?.role ?? role);

  return NextResponse.redirect(`${origin}${destination}`);
}
