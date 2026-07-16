"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDashboardPath } from "@/lib/auth/routes";

/**
 * Builders use the Connect Partner dashboard.
 * This route only exists as a redirect for bookmarks and legacy links.
 */
export default function BuilderDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login?redirect=/connect/dashboard");
      return;
    }

    if (profile?.role === "builder") {
      router.replace("/connect/dashboard");
      return;
    }

    router.replace(getDashboardPath(profile?.role));
  }, [loading, user, profile?.role, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 pt-16">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
    </div>
  );
}
