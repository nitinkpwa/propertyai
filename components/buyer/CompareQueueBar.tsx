"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useComparedPropertyToggle } from "@/lib/buyer/useComparedProperty";
import { MAX_COMPARE_PROPERTIES, removeCompareId } from "@/lib/buyer/compareStore";
import { removeComparedPropertyByPropertyId } from "@/lib/buyer/queries";
import { useAuth } from "@/lib/auth/AuthProvider";
import CompareSync from "./CompareSync";

/**
 * Floating compare queue — appears when 1+ properties are selected.
 * Hidden on the compare page itself.
 */
export default function CompareQueueBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { ids, count, hydrated } = useComparedPropertyToggle();

  const hideBar =
    !hydrated || count === 0 || Boolean(pathname?.startsWith("/buyer/compare"));

  const handleClearOne = async (propertyId: string) => {
    removeCompareId(propertyId);
    if (user) {
      await removeComparedPropertyByPropertyId(user.id, propertyId);
    }
  };

  return (
    <>
      <CompareSync />
      {hideBar ? null : (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-chrome z-layout-dropdown flex justify-center px-3 lg:bottom-6"
        >
          <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-neutral-200/90 bg-white/95 px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white tabular-nums">
                {count}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-heading-primary">
                  {count === 1
                    ? "1 property in compare"
                    : `${count} properties in compare`}
                </p>
                <p className="truncate text-[11px] text-muted">
                  {count < 2
                    ? "Add one more to unlock comparison"
                    : `Up to ${MAX_COMPARE_PROPERTIES} · Ready to compare`}
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-1 sm:flex">
              {ids.slice(0, MAX_COMPARE_PROPERTIES).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => void handleClearOne(id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-muted transition hover:bg-rose-50 hover:text-rose-600"
                  title="Remove"
                  aria-label="Remove from compare"
                >
                  ×
                </button>
              ))}
            </div>

            <Link
              href={
                user
                  ? "/buyer/compare"
                  : `/login?redirect=${encodeURIComponent("/buyer/compare")}`
              }
              className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              {count < 2 ? "View" : "Compare"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
