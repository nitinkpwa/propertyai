"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import { useAuth } from "@/lib/auth/AuthProvider";
import { changePassword } from "@/lib/auth/credentials";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { formatMobileDisplay } from "@/lib/auth/mobile";
import {
  getDashboardPath,
  getProfileLoginIdentifier,
} from "@/lib/auth/profile";
import { validatePasswordChange } from "@/lib/auth/validation";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordFieldError, setPasswordFieldError] = useState<string | null>(null);

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

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !profile) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    const validationError = validatePasswordChange({
      currentPassword,
      newPassword,
      confirmPassword: confirmNewPassword,
    });

    if (validationError) {
      setPasswordFieldError(validationError);
      return;
    }

    setPasswordFieldError(null);
    setPasswordSaving(true);

    try {
      const identifier = getProfileLoginIdentifier(profile);
      if (!identifier) {
        throw new Error("Unable to verify your account. Please sign in again.");
      }

      await changePassword({
        identifier,
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordSuccess("Password updated successfully.");
    } catch (err) {
      setPasswordError(getAuthErrorMessage(err));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
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
            Manage your account details and security settings.
          </p>

          <div className="mt-6 space-y-8">
            {error ? <AuthAlert type="error" message={error} /> : null}
            {success ? <AuthAlert type="success" message={success} /> : null}

            <form onSubmit={handleSubmit} className="space-y-1">
              <AuthInput
                label="Full Name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />

              <AuthInput
                label="Username"
                value={profile?.username ? `@${profile.username}` : ""}
                disabled
                readOnly
              />

              <AuthInput
                label="Phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="9876543210"
              />

              <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                Role:{" "}
                <span className="font-semibold capitalize text-neutral-900">
                  {profile?.role ?? "buyer"}
                </span>
              </div>

              {profile?.phone ? (
                <p className="px-1 text-xs text-neutral-500">
                  Login with {profile.username ? `@${profile.username}` : "username"} or{" "}
                  {formatMobileDisplay(profile.phone)}.
                </p>
              ) : null}

              <div className="pt-4">
                <AuthButton type="submit" loading={saving} loadingText="Saving...">
                  Save Changes
                </AuthButton>
              </div>
            </form>

            <div className="border-t border-neutral-100 pt-8">
              <h2 className="text-lg font-semibold text-neutral-900">Change Password</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Verify your current password before setting a new one.
              </p>

              {passwordError ? <div className="mt-4"><AuthAlert type="error" message={passwordError} /></div> : null}
              {passwordSuccess ? <div className="mt-4"><AuthAlert type="success" message={passwordSuccess} /></div> : null}

              <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-1">
                <AuthInput
                  label="Current Password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
                <AuthInput
                  label="New Password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <AuthInput
                  label="Confirm New Password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  error={passwordFieldError}
                />
                <div className="pt-4">
                  <AuthButton
                    type="submit"
                    loading={passwordSaving}
                    loadingText="Updating password..."
                  >
                    Update Password
                  </AuthButton>
                </div>
              </form>
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={getDashboardPath(profile?.role)}
                className="text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
              >
                Back to Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
