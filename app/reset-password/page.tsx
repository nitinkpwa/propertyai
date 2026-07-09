"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import AuthLayout from "@/components/auth/AuthLayout";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { sanitizeRedirectPath } from "@/lib/auth/routes";
import { validatePassword } from "@/lib/auth/validation";
import { supabase } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/supabase";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function verifyRecoverySession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setCanReset(Boolean(user));
      setCheckingSession(false);
    }

    verifyRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setCanReset(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setFieldError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setFieldError("Passwords do not match.");
      return;
    }

    setFieldError(null);
    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess(true);
      await supabase.auth.signOut();

      const redirect = sanitizeRedirectPath(searchParams.get("redirect"), "");
      const destination = redirect
        ? `/login?redirect=${encodeURIComponent(redirect)}`
        : "/login";

      setTimeout(() => {
        router.replace(destination);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <AuthLayout title="Reset password" subtitle="Verifying recovery session...">
        <div className="flex justify-center py-8">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      </AuthLayout>
    );
  }

  if (!canReset) {
    return (
      <AuthLayout title="Reset password" subtitle="Recovery link required">
        <AuthAlert
          type="error"
          message="Open the password reset link from your email, or request a new one."
        />
        <Link
          href="/forgot-password"
          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white no-underline"
        >
          Request reset link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" subtitle="Choose a new password for your account">
      {success ? (
        <AuthAlert type="success" message="Password updated. Redirecting to sign in..." />
      ) : null}
      {error ? <AuthAlert type="error" message={error} /> : null}

      <form onSubmit={handleSubmit} className="space-y-1">
        <AuthInput
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldError}
        />
        <AuthInput
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <div className="pt-2">
          <AuthButton type="submit" loading={loading} loadingText="Updating...">
            Update password
          </AuthButton>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Reset password" subtitle="Loading...">
          <div className="flex justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
          </div>
        </AuthLayout>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
