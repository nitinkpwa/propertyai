"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import Logo from "@/components/common/Logo";
import { signInWithIdentifier } from "@/lib/auth/credentials";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { sanitizeRedirectPath } from "@/lib/auth/routes";
import { validateLogin } from "@/lib/auth/validation";
import { supabase } from "@/lib/supabase";

function ConnectLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/connect/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

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
      const { profile } = await signInWithIdentifier(identifier, password);

      if (profile?.role && profile.role !== "builder") {
        await supabase.auth.signOut();
        throw new Error("This login is for Connect partner accounts only. Please use the main AreaIQ login.");
      }

      router.push(sanitizeRedirectPath(redirectTo, "/connect/dashboard"));
      router.refresh();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-24 pb-16">
      <div className="mx-auto w-full max-w-md px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <Logo size="dashboard" suffix="Connect" href="/connect" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-neutral-900">
            Connect Partner Login
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Sign in to manage your buyers, properties, and leads.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          {error ? <AuthAlert type="error" message={error} /> : null}

          <form onSubmit={handleSubmit} className="space-y-1">
            <AuthInput
              label="Username or Phone Number"
              autoComplete="username"
              placeholder="yourname or 9876543210"
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

            <div className="pt-4">
              <AuthButton type="submit" loading={loading} loadingText="Signing in...">
                Login
              </AuthButton>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Need access?{" "}
          <a
            href="mailto:connect@areaiq.app?subject=Partner%20Access%20Request"
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Contact us for partner onboarding
          </a>
        </p>
      </div>
    </div>
  );
}

export default function ConnectLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] pt-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      }
    >
      <ConnectLoginForm />
    </Suspense>
  );
}
