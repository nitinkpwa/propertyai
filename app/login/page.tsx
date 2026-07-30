"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import AuthLayout from "@/components/auth/AuthLayout";
import { signInWithIdentifier } from "@/lib/auth/credentials";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import {
  clearPendingAuthIntentIfManualLogin,
  resolvePostAuthDestination,
} from "@/lib/auth/pendingIntent";
import { getDashboardPath, upsertProfile } from "@/lib/auth/profile";
import {
  focusFirstFieldError,
  hasFieldErrors,
  validateLoginFields,
  type LoginFieldErrors,
} from "@/lib/auth/validation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const errorParam = searchParams.get("error");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  useEffect(() => {
    clearPendingAuthIntentIfManualLogin(Boolean(redirectTo));
  }, [redirectTo]);

  useEffect(() => {
    if (errorParam === "profile_missing") {
      setError(
        "Your account session is active but your profile could not be loaded. Sign in again. If this continues, contact support with your registered mobile number.",
      );
    }
  }, [errorParam]);

  const registerHref = redirectTo
    ? `/register?redirect=${encodeURIComponent(redirectTo)}`
    : "/register";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const nextErrors = validateLoginFields({ identifier, password });
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      focusFirstFieldError(nextErrors, ["identifier", "password"]);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      // Always resolve identifier → Auth mailbox (phone / username / contact_email).
      // Never pass arbitrary emails straight to Auth.
      const signedIn = await signInWithIdentifier(identifier.trim(), password);
      const { user, profile } = signedIn;

      const resolvedProfile =
        profile ??
        (await upsertProfile({
          user,
          fullName: (user.user_metadata?.full_name as string | undefined) ?? "User",
          username: user.user_metadata?.username as string | undefined,
          phone: user.user_metadata?.phone as string | undefined,
        }));

      if (!resolvedProfile?.role) {
        setError(
          "Signed in, but your profile is incomplete. Please try again or contact support with your mobile number.",
        );
        return;
      }

      const destination = resolvePostAuthDestination(
        getDashboardPath(resolvedProfile.role),
        redirectTo,
      );

      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in with your mobile number or username"
      footer={
        <p className="text-base text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href={registerHref}
            className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Create one free
          </Link>
        </p>
      }
    >
      {error ? <AuthAlert type="error" message={error} /> : null}

      {redirectTo && errorParam !== "profile_missing" ? (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Sign in to continue where you left off.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-1" noValidate>
        <AuthInput
          fieldKey="identifier"
          label="Mobile, username, or contact email"
          autoComplete="username"
          enterKeyHint="next"
          placeholder="9876543210 or yourname"
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            if (fieldErrors.identifier) {
              setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
            }
          }}
          error={fieldErrors.identifier}
        />

        <AuthInput
          fieldKey="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          enterKeyHint="go"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          error={fieldErrors.password}
        />

        <div className="mb-6 text-right">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-11 items-center text-base font-medium text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Forgot password?
          </Link>
        </div>

        <AuthButton type="submit" loading={loading} loadingText="Signing in...">
          Sign In
        </AuthButton>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Welcome back" subtitle="Sign in with your mobile number or username">
          <div className="flex justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
          </div>
        </AuthLayout>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
