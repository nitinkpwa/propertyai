"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import AuthLayout from "@/components/auth/AuthLayout";
import { signInWithEmailPassword, signInWithIdentifier } from "@/lib/auth/credentials";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import {
  clearPendingAuthIntentIfManualLogin,
  resolvePostAuthDestination,
} from "@/lib/auth/pendingIntent";
import { getDashboardPath, upsertProfile } from "@/lib/auth/profile";
import { validateLogin } from "@/lib/auth/validation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Navbar / manual login → clear stale protected-action intent
  useEffect(() => {
    clearPendingAuthIntentIfManualLogin(Boolean(redirectTo));
  }, [redirectTo]);

  const registerHref = redirectTo
    ? `/register?redirect=${encodeURIComponent(redirectTo)}`
    : "/register";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationError = validateLogin({ identifier, password });
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setFieldError(null);
    setLoading(true);

    try {
      const trimmed = identifier.trim();
      const signedIn = trimmed.includes("@")
        ? await signInWithEmailPassword(trimmed, password)
        : await signInWithIdentifier(trimmed, password);
      const { user, profile } = signedIn;

      const resolvedProfile =
        profile ??
        (await upsertProfile({
          user,
          fullName: (user.user_metadata?.full_name as string | undefined) ?? "User",
          username: user.user_metadata?.username as string | undefined,
          phone: user.user_metadata?.phone as string | undefined,
        }));

      const destination = resolvePostAuthDestination(
        getDashboardPath(resolvedProfile?.role),
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
      subtitle="Sign in to continue with AreaIQ Intelligence"
      footer={
        <p className="text-sm text-muted">
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

      {redirectTo ? (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          Sign in to continue where you left off.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-1">
        <AuthInput
          label="Email, username, or phone"
          autoComplete="username"
          placeholder="you@example.com, yourname, or 9876543210"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          error={fieldError}
        />

        <AuthInput
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <div className="mb-6 text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700"
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
        <AuthLayout title="Welcome back" subtitle="Sign in to continue with AreaIQ Intelligence">
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
