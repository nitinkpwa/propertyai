"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import Logo from "@/components/common/Logo";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { mobileToAuthEmail } from "@/lib/auth/mobile";
import { CONNECT_CITIES, EMERALD } from "@/lib/connect/constants";
import { upsertBuilderProfile } from "@/lib/connect/profile";
import { validateBuilderRegistration } from "@/lib/connect/validation";
import { supabase } from "@/lib/supabase";

export default function ConnectRegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [builderName, setBuilderName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [gst, setGst] = useState("");
  const [reraNumber, setReraNumber] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateBuilderRegistration({
      companyName,
      builderName,
      mobile,
      email,
      city,
      password,
      confirmPassword,
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
            full_name: builderName.trim(),
            role: "builder",
            phone: mobile,
            company: companyName.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Registration failed");

      await upsertBuilderProfile({
        user: data.user,
        companyName,
        builderName,
        phone: mobile,
        email,
        city,
        gst,
        reraNumber,
      });

      if (data.session) {
        router.push("/connect/dashboard");
        router.refresh();
        return;
      }

      setSuccess("Account created. You can now sign in with your phone number.");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const selectClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-24 pb-16">
      <div className="mx-auto w-full max-w-lg px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <Logo size="dashboard" suffix="Connect" href="/connect" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-neutral-900">
            Register as Builder
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Create your builder account to access the AreaIQ Connect portal.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          {error ? <AuthAlert type="error" message={error} /> : null}
          {success ? <AuthAlert type="success" message={success} /> : null}

          <form onSubmit={handleSubmit} className="space-y-1">
            <AuthInput
              label="Company Name"
              placeholder="Your company / developer name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />

            <AuthInput
              label="Builder Name"
              placeholder="Primary contact name"
              value={builderName}
              onChange={(event) => setBuilderName(event.target.value)}
            />

            <AuthInput
              label="Phone"
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
            />

            <AuthInput
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="company@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <AuthInput
              label="GST (optional)"
              placeholder="GST number"
              value={gst}
              onChange={(event) => setGst(event.target.value)}
            />

            <AuthInput
              label="RERA Number (optional)"
              placeholder="RERA registration number"
              value={reraNumber}
              onChange={(event) => setReraNumber(event.target.value)}
            />

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                City
              </label>
              <select
                className={selectClass}
                value={city}
                onChange={(event) => setCity(event.target.value)}
              >
                <option value="">Select city</option>
                {CONNECT_CITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

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
              <AuthButton type="submit" loading={loading} loadingText="Creating account...">
                Register
              </AuthButton>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Already registered?{" "}
          <Link
            href="/connect/login"
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
