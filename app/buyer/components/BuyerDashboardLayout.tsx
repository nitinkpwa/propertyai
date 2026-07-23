"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import NotificationBell from "@/components/buyer/NotificationBell";
import MobileBottomNav from "@/components/buyer/MobileBottomNav";
import BuyerTopBar from "@/components/buyer/BuyerTopBar";
import MobileTopBar from "@/components/layout/MobileTopBar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import NotificationBar from "@/components/notifications/NotificationBar";
import FeatureErrorBoundary from "@/components/stability/FeatureErrorBoundary";
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

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

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
      <div className="min-h-dvh bg-neutral-50 px-4 py-8 pt-chrome">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  const displayName = profile?.full_name ?? "Buyer";

  return (
    <div className="min-h-dvh bg-neutral-50 pt-0 lg:pt-chrome">
      <div className="lg:flex">
        {/* Desktop sidebar — always visible ≥1024px */}
        <div className="hidden lg:block">
          <BuyerSidebar
            fullName={profile?.full_name}
            mobileOpen
            onCloseMobile={closeMobile}
            onLogout={handleLogout}
            variant="desktop"
          />
        </div>

        {/* Mobile drawer — true overlay, no page blur/scale */}
        <MobileDrawer open={mobileOpen} onClose={closeMobile} ariaLabel="Buyer navigation">
          <BuyerSidebar
            fullName={profile?.full_name}
            mobileOpen
            onCloseMobile={closeMobile}
            onLogout={handleLogout}
            variant="drawer"
          />
        </MobileDrawer>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <div className="hidden lg:block">
            <BuyerTopBar subtitle={displayName} />
          </div>

          <MobileTopBar
            title={displayName}
            showLogo
            searchHref="/properties"
            profileHref="/buyer/profile"
            onMenu={() => setMobileOpen(true)}
            rightSlot={
              <FeatureErrorBoundary name="Notifications" compact>
                <NotificationBell />
              </FeatureErrorBoundary>
            }
          />

          {/* Smart bar — mobile/tablet under header; desktop provided by NavbarWrapper */}
          <div className="lg:hidden">
            <FeatureErrorBoundary name="Intelligence bar" compact>
              <NotificationBar variant="sticky" />
            </FeatureErrorBoundary>
          </div>

          {/* Tablet chrome (md–lg) */}
          <div className="sticky top-0 z-30 hidden items-center gap-3 border-b border-neutral-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl md:flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-body shadow-sm active:scale-[0.98]"
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
              <p className="truncate text-sm font-semibold text-heading-primary">{displayName}</p>
            </div>
            <FeatureErrorBoundary name="Notifications" compact>
              <NotificationBell />
            </FeatureErrorBoundary>
            <Link
              href="/properties"
              className="inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-emerald-600 active:scale-[0.98]"
            >
              Browse
            </Link>
          </div>

          <main className="flex-1 px-4 py-6 pb-nav sm:px-6 sm:py-8 lg:px-8 lg:py-10 lg:pb-10">
            <div className="animate-page-enter mx-auto w-full max-w-6xl">
              <FeatureErrorBoundary name="Buyer page">{children}</FeatureErrorBoundary>
            </div>
          </main>

          <FeatureErrorBoundary name="Mobile nav" compact>
            <MobileBottomNav />
          </FeatureErrorBoundary>
        </div>
      </div>
    </div>
  );
}
