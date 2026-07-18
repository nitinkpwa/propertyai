"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AccountTypeSelector from "@/components/auth/AccountTypeSelector";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import AuthLayout from "@/components/auth/AuthLayout";
import { registerAccount } from "@/lib/auth/credentials";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import type { AccountType } from "@/lib/auth/mobile";
import {
  clearPendingAuthIntentIfManualLogin,
  resolvePostAuthDestination,
} from "@/lib/auth/pendingIntent";
import { getDashboardPath } from "@/lib/auth/profile";
import { validateRegistration } from "@/lib/auth/validation";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const isBuyer = accountType === "buyer";

  useEffect(() => {
    clearPendingAuthIntentIfManualLogin(Boolean(redirectTo));
  }, [redirectTo]);

  const loginHref = redirectTo
    ? `/login?redirect=${encodeURIComponent(redirectTo)}`
    : "/login";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationError = validateRegistration({
      fullName,
      username: isBuyer ? undefined : username,
      mobile,
      password,
      confirmPassword,
      accountType,
      email: isBuyer ? email : undefined,
    });

    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setFieldError(null);
    setLoading(true);

    try {
      await registerAccount({
        fullName: fullName.trim(),
        username: isBuyer ? undefined : username,
        phone: mobile,
        password,
        role: accountType,
        contactEmail: isBuyer && email.trim() ? email.trim() : undefined,
      });

      // Buyers with a pending protected action return to the property; others use role dashboard.
      const destination =
        accountType === "buyer"
          ? resolvePostAuthDestination(getDashboardPath(accountType), redirectTo)
          : getDashboardPath(accountType);

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
      title={isBuyer ? "Start your property journey" : "Create your account"}
      subtitle={
        isBuyer
          ? "Join AreaIQ in seconds — no long forms, no OTP."
          : "Join AreaIQ and start listing smarter"
      }
      footer={
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Sign in
          </Link>
        </p>
      }
    >
      {error ? <AuthAlert type="error" message={error} /> : null}

      {redirectTo && isBuyer ? (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          Create your account to continue where you left off.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-1">
        <AuthInput
          label="Full Name"
          autoComplete="name"
          placeholder="Your full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />

        {!isBuyer ? (
          <AuthInput
            label="Username"
            autoComplete="username"
            placeholder="yourname"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
          />
        ) : null}

        <AccountTypeSelector value={accountType} onChange={setAccountType} />

        <AuthInput
          label="Mobile Number"
          type="tel"
          autoComplete="tel"
          inputMode="numeric"
          placeholder="98765 43210"
          value={mobile}
          onChange={(event) => setMobile(event.target.value)}
        />

        {isBuyer ? (
          <AuthInput
            label="Email (optional)"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        ) : null}

        <AuthInput
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <AuthInput
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={fieldError}
        />

        {isBuyer ? (
          <p className="pb-2 text-xs leading-relaxed text-muted">
            Budget, preferences, and timeline are collected later as you explore — keeping signup fast.
          </p>
        ) : null}

        <div className="pt-2">
          <AuthButton type="submit" loading={loading} loadingText="Creating account...">
            {isBuyer ? "Create Buyer Account" : "Create Account"}
          </AuthButton>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Create your account" subtitle="Join AreaIQ">
          <div className="flex justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
          </div>
        </AuthLayout>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
