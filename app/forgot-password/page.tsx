"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import AuthLayout from "@/components/auth/AuthLayout";
import { getAuthErrorMessage, getRecoveryLinkErrorMessage } from "@/lib/auth/errors";
import { buildPasswordRecoveryRedirectUrl, getRequiredSupabaseRedirectUrls } from "@/lib/auth/redirects";
import { supabase } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const linkError = getRecoveryLinkErrorMessage(searchParams.get("error"));

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const redirectTo = buildPasswordRecoveryRedirectUrl();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });

      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="We will email you a reset link"
      footer={
        <p className="text-sm text-muted">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        </p>
      }
    >
      {linkError ? <AuthAlert type="error" message={linkError} /> : null}
      {sent ? (
        <AuthAlert
          type="success"
          message="If an account exists for that email, a reset link has been sent. Open the link, then set your new password."
        />
      ) : null}
      {error ? <AuthAlert type="error" message={error} /> : null}

      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-1">
          <AuthInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="pt-2">
            <AuthButton type="submit" loading={loading} loadingText="Sending...">
              Send reset link
            </AuthButton>
          </div>
        </form>
      ) : null}

      {typeof window !== "undefined" && process.env.NODE_ENV === "development" ? (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Dev: Supabase Redirect URLs must include{" "}
          {getRequiredSupabaseRedirectUrls(window.location.origin).join(" and ")}.
        </p>
      ) : null}
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Forgot password?" subtitle="Loading...">
          <div className="flex justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
          </div>
        </AuthLayout>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
