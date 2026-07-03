import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Handles Supabase email links that use token_hash + type query params
 * (e.g. ?token_hash=...&type=recovery&next=/reset-password).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/reset-password";
  const destination = next.startsWith("/") ? next : "/reset-password";

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/forgot-password?error=invalid_link`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    const code = error.message.toLowerCase().includes("expired")
      ? "otp_expired"
      : "auth_confirm_failed";
    return NextResponse.redirect(`${origin}/forgot-password?error=${code}`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
