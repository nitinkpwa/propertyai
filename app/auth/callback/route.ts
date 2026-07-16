import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { normalizeMobileNumber } from "@/lib/auth/mobile";
import { getDashboardPath } from "@/lib/auth/profile";
import { sanitizeRedirectPath } from "@/lib/auth/routes";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? searchParams.get("redirect_to") ?? "/buyer";
  const type = searchParams.get("type");
  const destination = sanitizeRedirectPath(next, "/buyer");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
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
    const codeParam = error?.message.toLowerCase().includes("expired")
      ? "otp_expired"
      : "auth_callback_failed";
    return NextResponse.redirect(`${origin}/forgot-password?error=${codeParam}`);
  }

  // Password recovery — session established; skip profile upsert.
  if (destination === "/reset-password" || type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const fullName =
    (data.user.user_metadata?.full_name as string | undefined) ??
    data.user.email?.split("@")[0] ??
    "User";

  // Public auth callback may only set buyer/seller. Admin/builder are provisioned server-side.
  const rawRole = data.user.user_metadata?.role;
  const role: "buyer" | "seller" =
    rawRole === "seller" ? "seller" : "buyer";

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

  const finalDestination =
    destination !== "/buyer" ? destination : getDashboardPath(profile?.role ?? role);

  return NextResponse.redirect(`${origin}${finalDestination}`);
}
