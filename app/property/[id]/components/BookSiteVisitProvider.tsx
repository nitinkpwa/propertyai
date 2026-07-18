"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  buildLoginUrlWithIntent,
  clearPendingAuthIntent,
  matchPendingIntentForProperty,
} from "@/lib/auth/pendingIntent";
import SiteVisitModal from "./SiteVisitModal";

export const BOOK_VISIT_QUERY = "bookVisit";

interface BookSiteVisitContextValue {
  requestBookVisit: () => void;
  /** Call after a successful booking to clear pending auth intent. */
  onVisitBooked: () => void;
}

const BookSiteVisitContext = createContext<BookSiteVisitContextValue | null>(null);

interface BookSiteVisitProviderProps {
  propertyId: string;
  propertyName: string;
  builderName?: string;
  children: React.ReactNode;
}

export function buildBookVisitReturnPath(pathname: string): string {
  const base = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${BOOK_VISIT_QUERY}=1`;
}

/** @deprecated use buildLoginUrlWithIntent — kept for SiteVisitModal imports */
export function buildLoginUrlForBookVisit(pathname: string, propertyId?: string): string {
  return buildLoginUrlWithIntent({
    action: "book_visit",
    propertyId: propertyId ?? null,
    returnUrl: buildBookVisitReturnPath(pathname),
  });
}

export function BookSiteVisitProvider({
  propertyId,
  propertyName,
  builderName,
  children,
}: BookSiteVisitProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  const openForBuyer = useCallback((): "opened" | "role_blocked" => {
    if (profile?.role !== "buyer") {
      setRoleMessage("Please continue as a Buyer to book a site visit.");
      return "role_blocked";
    }
    setRoleMessage(null);
    setDrawerKey((k) => k + 1);
    setVisitModalOpen(true);
    return "opened";
  }, [profile?.role]);

  const requestBookVisit = useCallback(() => {
    if (loading) return;

    if (!user) {
      router.push(
        buildLoginUrlWithIntent({
          action: "book_visit",
          propertyId,
          returnUrl: buildBookVisitReturnPath(pathname),
        }),
      );
      return;
    }

    openForBuyer();
  }, [loading, user, router, pathname, propertyId, openForBuyer]);

  const resumeAfterLogin = useCallback((): "opened" | "role_blocked" | "redirected" => {
    if (loading) return "redirected";

    if (!user) {
      router.push(
        buildLoginUrlWithIntent({
          action: "book_visit",
          propertyId,
          returnUrl: buildBookVisitReturnPath(pathname),
        }),
      );
      return "redirected";
    }

    return openForBuyer();
  }, [loading, user, router, pathname, propertyId, openForBuyer]);

  const onVisitBooked = useCallback(() => {
    clearPendingAuthIntent();
  }, []);

  useEffect(() => {
    if (!roleMessage) return;
    const t = setTimeout(() => setRoleMessage(null), 5000);
    return () => clearTimeout(t);
  }, [roleMessage]);

  const value = useMemo(
    () => ({ requestBookVisit, onVisitBooked }),
    [requestBookVisit, onVisitBooked],
  );

  return (
    <BookSiteVisitContext.Provider value={value}>
      {children}

      <Suspense fallback={null}>
        <BookVisitResumeEffect
          propertyId={propertyId}
          onResume={resumeAfterLogin}
          authReady={!loading}
        />
      </Suspense>

      <SiteVisitModal
        key={drawerKey}
        propertyId={propertyId}
        propertyName={propertyName}
        builderName={builderName}
        open={visitModalOpen}
        onClose={() => setVisitModalOpen(false)}
        onSuccess={onVisitBooked}
      />

      {roleMessage ? (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-lg"
        >
          {roleMessage}
        </div>
      ) : null}
    </BookSiteVisitContext.Provider>
  );
}

function BookVisitResumeEffect({
  propertyId,
  onResume,
  authReady,
}: {
  propertyId: string;
  onResume: () => "opened" | "role_blocked" | "redirected";
  authReady: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!authReady || handledRef.current) return;

    const fromQuery = searchParams.get(BOOK_VISIT_QUERY) === "1";
    const fromIntent = matchPendingIntentForProperty(propertyId, "book_visit");
    if (!fromQuery && !fromIntent) return;

    handledRef.current = true;
    const result = onResume();

    if (result === "redirected") return;

    // Clear intent once modal is opened (or role-blocked)
    if (result === "opened") {
      clearPendingAuthIntent();
    }

    if (fromQuery) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(BOOK_VISIT_QUERY);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [authReady, searchParams, onResume, router, pathname, propertyId]);

  return null;
}

export function useBookSiteVisit() {
  const ctx = useContext(BookSiteVisitContext);
  if (!ctx) {
    throw new Error("useBookSiteVisit must be used within BookSiteVisitProvider");
  }
  return ctx;
}
