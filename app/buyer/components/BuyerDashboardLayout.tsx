"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NotificationBell from "@/components/buyer/NotificationBell";
import MobileBottomNav from "@/components/buyer/MobileBottomNav";
import BuyerTopBar from "@/components/buyer/BuyerTopBar";
import MobileTopBar from "@/components/layout/MobileTopBar";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDashboardPath } from "@/lib/auth/profile";
import { isBuyerRole } from "@/lib/buyer/types";
import BuyerSidebar from "./BuyerSidebar";

export default function BuyerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (profile && !isBuyerRole(profile.role)) {
      router.replace(getDashboardPath(profile.role));
    }
  }, [loading, user, profile, router, pathname]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  if (loading || !user || (profile && !isBuyerRole(profile.role))) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-8 lg:pt-16">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 lg:pt-16">
      <div className="lg:flex">
        <BuyerSidebar
          fullName={profile?.full_name}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          onLogout={handleLogout}
        />

        {mobileOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-neutral-900/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <div className="hidden lg:block">
            <BuyerTopBar subtitle={profile?.full_name ?? undefined} />
          </div>

          <MobileTopBar
            title={profile?.full_name ?? "Buyer"}
            showLogo
            searchHref="/properties"
            profileHref="/buyer/profile"
            onMenu={() => setMobileOpen(true)}
            rightSlot={<NotificationBell />}
          />

          <div className="sticky top-16 z-30 hidden items-center gap-3 border-b border-neutral-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl md:flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-body shadow-sm"
              aria-label="Open menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark">
                Buyer Portal
              </p>
              <p className="truncate text-sm font-semibold text-heading-primary">
                {profile?.full_name ?? "Dashboard"}
              </p>
            </div>
            <NotificationBell />
            <Link href="/properties" className="text-xs font-semibold text-emerald-600">
              Browse
            </Link>
          </div>

          <main className="flex-1 px-4 py-6 pb-nav sm:px-6 sm:py-8 lg:px-8 lg:py-10 lg:pb-10">
            <div className="animate-page-enter">{children}</div>
          </main>

          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
