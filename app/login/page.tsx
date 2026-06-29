"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import AuthLayout from "@/components/auth/AuthLayout";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { mobileToAuthEmail } from "@/lib/auth/mobile";
import {
  fetchProfile,
  getDashboardPath,
  upsertProfile,
} from "@/lib/auth/profile";
import { validateLogin } from "@/lib/auth/validation";
import { supabase } from "@/lib/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

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
      const { data, error: signInError } = await supabase.auth.signInWithPassword(
        {
          email: authEmail,
          password,
        },
      );

      if (signInError) throw signInError;
      if (!data.user) throw new Error("Login failed");

      const profile =
        (await fetchProfile(data.user.id)) ??
        (await upsertProfile({
          user: data.user,
          fullName:
            (data.user.user_metadata?.full_name as string | undefined) ??
            "User",
          phone: mobile,
        }));

      const destination =
        redirectTo && redirectTo.startsWith("/")
          ? redirectTo
          : getDashboardPath(profile?.role);

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
      subtitle="Sign in to your AreaIQ account"
      footer={
        <p className="text-sm text-neutral-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Create one free
          </Link>
        </p>
      }
    >
      {error ? <AuthAlert type="error" message={error} /> : null}

      <form onSubmit={handleSubmit} className="space-y-1">
        <AuthInput
          label="Mobile Number"
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
        <AuthLayout title="Welcome back" subtitle="Sign in to your AreaIQ account">
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
