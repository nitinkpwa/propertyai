"use client";

import Link from "next/link";
import { useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import AuthLayout from "@/components/auth/AuthLayout";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { mobileToAuthEmail, isValidMobileNumber } from "@/lib/auth/mobile";
import { getSiteUrl, supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isValidMobileNumber(mobile)) {
      setFieldError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setFieldError(null);
    setLoading(true);

    try {
      const authEmail = mobileToAuthEmail(mobile);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        authEmail,
        {
          redirectTo: `${getSiteUrl()}/reset-password`,
        },
      );

      if (resetError) throw resetError;

      setSuccess(
        "If an account exists for that mobile number, we sent password reset instructions.",
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
      subtitle="Enter your mobile number and we will send you a reset link"
      footer={
        <Link
          href="/login"
          className="text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
        >
          Back to sign in
        </Link>
      }
    >
      {error ? <AuthAlert type="error" message={error} /> : null}
      {success ? <AuthAlert type="success" message={success} /> : null}

      <form onSubmit={handleSubmit}>
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

        <AuthButton
          type="submit"
          loading={loading}
          loadingText="Sending link..."
        >
          Send Reset Link
        </AuthButton>
      </form>
    </AuthLayout>
  );
}
