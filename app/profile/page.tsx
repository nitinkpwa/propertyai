"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/profile");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 pt-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Profile
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Manage your account details and contact information.
          </p>

          <div className="mt-6 space-y-4">
            {error ? <AuthAlert type="error" message={error} /> : null}
            {success ? <AuthAlert type="success" message={success} /> : null}

            <form onSubmit={handleSubmit} className="space-y-1">
              <AuthInput
                label="Full Name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />

              <AuthInput
                label="Email"
                value={user.email ?? ""}
                disabled
                readOnly
              />

              <AuthInput
                label="Phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+91 98765 43210"
              />

              <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                Account type:{" "}
                <span className="font-semibold capitalize text-neutral-900">
                  {profile?.role ?? "buyer"}
                </span>
              </div>

              <div className="pt-4">
                <AuthButton type="submit" loading={saving} loadingText="Saving...">
                  Save Changes
                </AuthButton>
              </div>
            </form>
          </div>

          <div className="mt-8 border-t border-neutral-100 pt-6">
            <Link
              href="/buyer"
              className="text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
