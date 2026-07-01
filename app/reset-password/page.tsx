"use client";

import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { EMERALD } from "@/lib/auth/constants";

// TODO(future): Wire this page to WhatsApp OTP / SMS OTP recovery once implemented.
// TODO(future): Remove email-based Supabase recovery — not used for AreaIQ auth.

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Reset password"
      subtitle="Password recovery is not available yet"
    >
      <div
        role="status"
        className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm leading-relaxed text-neutral-600"
      >
        Password recovery will be available soon. Please contact AreaIQ Support to
        reset your password.
      </div>

      <Link
        href="/login"
        className="inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white no-underline shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all duration-200 hover:shadow-[0_4px_14px_rgba(34,197,94,0.45)] hover:brightness-105 active:scale-[0.98]"
        style={{ backgroundColor: EMERALD }}
      >
        Back to Login
      </Link>
    </AuthLayout>
  );
}
