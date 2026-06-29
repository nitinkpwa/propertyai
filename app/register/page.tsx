"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AccountTypeSelector from "@/components/auth/AccountTypeSelector";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import AuthLayout from "@/components/auth/AuthLayout";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { mobileToAuthEmail, type AccountType } from "@/lib/auth/mobile";
import { getDashboardPath, upsertProfile } from "@/lib/auth/profile";
import { validateRegistration } from "@/lib/auth/validation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateRegistration({
      fullName,
      mobile,
      password,
      confirmPassword,
      accountType,
    });

    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setFieldError(null);
    setLoading(true);

    try {
      const authEmail = mobileToAuthEmail(mobile);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: accountType,
            phone: mobile,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Registration failed");

      await upsertProfile({
        user: data.user,
        fullName: fullName.trim(),
        role: accountType,
        phone: mobile,
      });

      if (data.session) {
        router.push(getDashboardPath(accountType));
        router.refresh();
        return;
      }

      setSuccess("Account created. You can now sign in with your mobile number.");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join AreaIQ and start exploring smarter property decisions"
      footer={
        <p className="text-sm text-neutral-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Sign in
          </Link>
        </p>
      }
    >
      {error ? <AuthAlert type="error" message={error} /> : null}
      {success ? <AuthAlert type="success" message={success} /> : null}

      <form onSubmit={handleSubmit} className="space-y-1">
        <AuthInput
          label="Full Name"
          autoComplete="name"
          placeholder="Your full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />

        <AccountTypeSelector
          value={accountType}
          onChange={setAccountType}
        />

        <AuthInput
          label="Mobile Number"
          type="tel"
          autoComplete="tel"
          inputMode="numeric"
          placeholder="98765 43210"
          value={mobile}
          onChange={(event) => setMobile(event.target.value)}
        />

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

        <div className="pt-2">
          <AuthButton
            type="submit"
            loading={loading}
            loadingText="Creating account..."
          >
            Create Account
          </AuthButton>
        </div>
      </form>
    </AuthLayout>
  );
}
