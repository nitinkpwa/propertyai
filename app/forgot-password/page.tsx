"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import AuthLayout from "@/components/auth/AuthLayout";
import { resolveLoginAuthEmail } from "@/lib/auth/credentials";
import { getAuthErrorMessage, getRecoveryLinkErrorMessage } from "@/lib/auth/errors";
import { buildPasswordRecoveryRedirectUrl, getRequiredSupabaseRedirectUrls } from "@/lib/auth/redirects";
import { supabase } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const linkError = getRecoveryLinkErrorMessage(searchParams.get("error"));

  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Enter your registered mobile number, username, or contact email.");
      return;
    }

    setLoading(true);

    try {
      const authEmail = await resolveLoginAuthEmail(trimmed);
      if (!authEmail) {
        // Same generic success to avoid account enumeration
        setSent(true);
        setInfo(
          "If an account matches that mobile number or contact email, we can help you reset. AreaIQ accounts sign in with mobile — if you did not receive a link, email support@areaiq.app with your registered phone.",
        );
        return;
      }

      // Auth mailbox is phone@areaiq.app — reset mail only delivers when the
      // user also registered a reachable contact_email and ops has mail wired
      // to forward, OR when auth email is a real inbox. Prefer honest copy.
      const looksSynthetic = /@areaiq\.app$/i.test(authEmail);
      if (looksSynthetic) {
        setSent(true);
        setInfo(
          "AreaIQ buyer accounts use your mobile number to sign in. Password reset by email is only available if you saved a contact email and our mail service can reach it. Email support@areaiq.app with your registered 10-digit mobile for help resetting your password.",
        );
        return;
      }

      const redirectTo = buildPasswordRecoveryRedirectUrl();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo,
      });

      if (resetError) throw resetError;
      setSent(true);
      setInfo(
        "If an account exists, a reset link has been sent. Open the link, then set your new password.",
      );
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Use your registered mobile number"
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
      {sent && info ? <AuthAlert type="success" message={info} /> : null}
      {error ? <AuthAlert type="error" message={error} /> : null}

      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-1">
          <AuthInput
            label="Mobile, username, or contact email"
            autoComplete="username"
            placeholder="9876543210"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <p className="mb-3 text-sm leading-relaxed text-muted">
            Buyers sign in with mobile. Contact email (if you added one) is for updates — not your login ID.
          </p>
          <div className="pt-2">
            <AuthButton type="submit" loading={loading} loadingText="Checking...">
              Continue
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
