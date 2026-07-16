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
import SiteVisitModal from "./SiteVisitModal";

export const BOOK_VISIT_QUERY = "bookVisit";

interface BookSiteVisitContextValue {
  requestBookVisit: () => void;
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

export function buildLoginUrlForBookVisit(pathname: string): string {
  return `/login?redirect=${encodeURIComponent(buildBookVisitReturnPath(pathname))}`;
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
      router.push(buildLoginUrlForBookVisit(pathname));
      return;
    }

    openForBuyer();
  }, [loading, user, router, pathname, openForBuyer]);

  const resumeAfterLogin = useCallback((): "opened" | "role_blocked" | "redirected" => {
    if (loading) return "redirected";

    if (!user) {
      router.push(buildLoginUrlForBookVisit(pathname));
      return "redirected";
    }

    return openForBuyer();
  }, [loading, user, router, pathname, openForBuyer]);

  useEffect(() => {
    if (!roleMessage) return;
    const t = setTimeout(() => setRoleMessage(null), 5000);
    return () => clearTimeout(t);
  }, [roleMessage]);

  const value = useMemo(() => ({ requestBookVisit }), [requestBookVisit]);

  return (
    <BookSiteVisitContext.Provider value={value}>
      {children}

      <Suspense fallback={null}>
        <BookVisitResumeEffect onResume={resumeAfterLogin} authReady={!loading} />
      </Suspense>

      <SiteVisitModal
        key={drawerKey}
        propertyId={propertyId}
        propertyName={propertyName}
        builderName={builderName}
        open={visitModalOpen}
        onClose={() => setVisitModalOpen(false)}
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
  onResume,
  authReady,
}: {
  onResume: () => "opened" | "role_blocked" | "redirected";
  authReady: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!authReady || handledRef.current) return;
    if (searchParams.get(BOOK_VISIT_QUERY) !== "1") return;

    handledRef.current = true;
    const result = onResume();

    // Do not race a login navigation with a replace that strips the flag.
    if (result === "redirected") return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete(BOOK_VISIT_QUERY);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [authReady, searchParams, onResume, router, pathname]);

  return null;
}

export function useBookSiteVisit() {
  const ctx = useContext(BookSiteVisitContext);
  if (!ctx) {
    throw new Error("useBookSiteVisit must be used within BookSiteVisitProvider");
  }
  return ctx;
}
