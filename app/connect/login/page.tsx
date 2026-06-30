"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import Logo from "@/components/common/Logo";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { mobileToAuthEmail } from "@/lib/auth/mobile";
import { fetchProfile } from "@/lib/auth/profile";
import { validateLogin } from "@/lib/auth/validation";
import { supabase } from "@/lib/supabase";

function ConnectLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/connect/dashboard";

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationError = validateLogin({ mobile, password });
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setFieldError(null);
    setLoading(true);

    try {
      const authEmail = mobileToAuthEmail(mobile);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (signInError) throw signInError;
      if (!data.user) throw new Error("Login failed");

      const profile = await fetchProfile(data.user.id);
      if (profile?.role && profile.role !== "builder") {
        await supabase.auth.signOut();
        throw new Error("This login is for builder accounts only. Please use the main AreaIQ login.");
      }

      router.push(redirectTo.startsWith("/") ? redirectTo : "/connect/dashboard");
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
            Builder Login
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Sign in to manage projects, inventory, and leads.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          {error ? <AuthAlert type="error" message={error} /> : null}

          <form onSubmit={handleSubmit} className="space-y-1">
            <AuthInput
              label="Phone Number"
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
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
                href={`/forgot-password?redirect=${encodeURIComponent("/connect/dashboard")}`}
                className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700"
              >
                Forgot password?
              </Link>
            </div>

            <AuthButton type="submit" loading={loading} loadingText="Signing in...">
              Login
            </AuthButton>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          New builder?{" "}
          <Link
            href="/connect/register"
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Register as Builder
          </Link>
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
