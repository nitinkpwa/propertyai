"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/common/Logo";
import SocialLinks from "@/components/common/SocialLinks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EMERALD } from "@/lib/auth/constants";
import {
  getMobileNavItems,
  getRoleDisplayLabel,
} from "@/lib/auth/mobileNav";
import {
  getInitials,
  getProfileDisplayName,
} from "@/lib/auth/profile";
import { requestOnboardingRestart } from "@/lib/onboarding/storage";

type MobileNavPanelProps = {
  open: boolean;
  onClose: () => void;
  /** Optional accent for homepage green. Defaults to auth emerald. */
  accentColor?: string;
};

const AUTH_ITEM_IDS = new Set(["signin", "register"]);

export default function MobileNavPanel({
  open,
  onClose,
  accentColor = EMERALD,
}: MobileNavPanelProps) {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const role = profile?.role ?? null;
  const items = getMobileNavItems(loading ? null : role);
  const showProfile = Boolean(!loading && user && role);

  const navItems = items.filter((item) => !AUTH_ITEM_IDS.has(item.id));
  const authItems = items.filter(
    (item) => AUTH_ITEM_IDS.has(item.id) && Boolean(item.href),
  );

  const handleLogout = async () => {
    await signOut();
    onClose();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-[250ms] ease-out lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        id="mobile-nav"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[88vw] max-w-[320px] flex-col overflow-x-hidden overflow-y-hidden bg-white shadow-[4px_0_32px_rgba(0,0,0,0.08)] transition-transform duration-[250ms] ease-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          paddingTop: "var(--safe-top)",
          paddingBottom: "var(--safe-bottom)",
        }}
        aria-hidden={!open}
        aria-label="Mobile navigation"
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-6">
          <div className="min-w-0" onClick={onClose}>
            <Logo
              size="footer"
              showTagline={false}
              accentColor={accentColor}
              className="min-w-0 [&_img]:max-h-[34px] [&_img]:w-auto"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-neutral-100 hover:text-heading-secondary"
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M4 4L14 14M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {showProfile ? (
          <div className="shrink-0 border-b border-neutral-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: accentColor }}
                aria-hidden
              >
                {getInitials(profile?.full_name, profile?.username ?? profile?.phone)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-heading-primary">
                  {getProfileDisplayName(profile, user)}
                </p>
                <p className="truncate text-xs font-medium text-emerald-700">
                  {getRoleDisplayLabel(role)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <nav
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-6 py-4"
          aria-label="Mobile navigation links"
        >
          {navItems.map((item) => {
            if (item.action === "logout") {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-left text-base font-medium text-rose-600 transition-colors hover:bg-rose-100"
                >
                  {item.label}
                </button>
              );
            }

            if (!item.href) return null;

            if (item.highlight) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-base font-medium text-emerald-900 transition-colors hover:bg-emerald-100"
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {item.icon ?? "📊"}
                  </span>
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className="rounded-xl px-6 py-4 text-base font-medium text-body transition-colors hover:bg-neutral-50 hover:text-heading-primary"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {authItems.length > 0 ? (
          <div className="shrink-0 space-y-2 border-t border-neutral-100 px-6 py-4">
            {authItems.map((item) => {
              if (!item.href) return null;
              const isPrimary = item.id === "register";
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className={
                    isPrimary
                      ? "flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-base font-medium text-white transition-colors"
                      : "flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 py-3.5 text-base font-medium text-heading-primary transition-colors hover:bg-neutral-50"
                  }
                  style={isPrimary ? { backgroundColor: accentColor } : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}

        <div className="shrink-0 space-y-2 border-t border-neutral-100 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              requestOnboardingRestart();
            }}
            className="w-full rounded-xl border border-emerald-100 bg-[#F3FAEF] px-4 py-3 text-left text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
          >
            Restart Tour
          </button>
          <SocialLinks variant="drawer" />
        </div>
      </aside>
    </>
  );
}
