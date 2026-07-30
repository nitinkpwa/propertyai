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
      <div className="min-h-screen bg-neutral-50 px-4 pt-24" aria-busy="true">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-10 w-40 animate-shimmer rounded-xl" />
          <div className="h-48 animate-shimmer rounded-2xl" />
          <div className="h-64 animate-shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-layout pb-nav lg:pb-16">
      <div className="mx-auto max-w-2xl space-y-5 px-4 animate-page-enter sm:px-6 lg:px-8">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-heading-primary">Settings</h1>
          <p className="mt-1 text-base text-muted">Account, security, and preferences</p>
          {profile?.role === "buyer" ? (
            <p className="mt-3 text-sm text-body">
              Looking for buyer preferences (budget, localities, purpose)?{" "}
              <Link href="/buyer/profile" className="font-semibold text-emerald-700 underline">
                Open buyer profile
              </Link>
            </p>
          ) : null}
        </div>

        {error ? <AuthAlert type="error" message={error} /> : null}
        {success ? <AuthAlert type="success" message={success} /> : null}

        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-heading-primary">Profile</h2>
          <p className="mt-1 text-sm text-muted">Your public account details</p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-1">
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
            <div className="rounded-xl bg-neutral-50 px-4 py-3.5 text-base text-body">
              Role:{" "}
              <span className="font-semibold capitalize text-heading-primary">
                {profile?.role ?? "buyer"}
              </span>
            </div>
            {profile?.phone ? (
              <p className="px-1 text-xs text-muted">
                Login with {profile.username ? `@${profile.username}` : "username"} or{" "}
                {formatMobileDisplay(profile.phone)}.
              </p>
            ) : null}
            <div className="pt-3">
              <AuthButton type="submit" loading={saving} loadingText="Saving...">
                Save Changes
              </AuthButton>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-heading-primary">Security</h2>
          <p className="mt-1 text-sm text-muted">
            Verify your current password before setting a new one.
          </p>
          {passwordError ? (
            <div className="mt-4">
              <AuthAlert type="error" message={passwordError} />
            </div>
          ) : null}
          {passwordSuccess ? (
            <div className="mt-4">
              <AuthAlert type="success" message={passwordSuccess} />
            </div>
          ) : null}
          <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-1">
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
            <div className="pt-3">
              <AuthButton
                type="submit"
                loading={passwordSaving}
                loadingText="Updating password..."
              >
                Update Password
              </AuthButton>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-heading-primary">Preferences</h2>
          <p className="mt-1 text-sm text-muted">Notifications and dashboard shortcuts</p>
          <div className="mt-4 space-y-1">
            <Link
              href={getDashboardPath(profile?.role)}
              className="flex min-h-12 items-center justify-between rounded-xl px-3 text-base font-medium text-heading-primary active:bg-neutral-50"
            >
              Open dashboard
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/buyer/notifications"
              className="flex min-h-12 items-center justify-between rounded-xl px-3 text-base font-medium text-heading-primary active:bg-neutral-50"
            >
              Notification settings
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-12 w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-base font-semibold text-rose-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
