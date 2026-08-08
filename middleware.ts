import { type NextRequest, NextResponse } from "next/server";
import {
  getDashboardPath,
  getUnauthorizedRedirect,
  sanitizeRedirectPath,
} from "@/lib/auth/routes";
import {
  endPerfRequest,
  startPerfRequest,
  toServerTimingHeader,
} from "@/lib/perf/timing";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/buyer",
  "/seller",
  "/builder",
  "/profile",
  "/connect/dashboard",
  "/admin",
  "/debug",
];
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];
const CONNECT_AUTH_PAGES = ["/connect/login"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthPage(pathname: string) {
  return AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
}

function isConnectAuthPage(pathname: string) {
  return CONNECT_AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Profile role is only needed for gates / logged-in auth redirects — not public shells. */
function needsProfileRole(pathname: string) {
  return (
    isProtectedPath(pathname) ||
    isAuthPage(pathname) ||
    isConnectAuthPage(pathname) ||
    isAdminPath(pathname)
  );
}

function withPerfHeaders(response: NextResponse) {
  const timing = toServerTimingHeader();
  if (timing) {
    response.headers.set("Server-Timing", timing);
  }
  endPerfRequest("middleware");
  return response;
}

/**
 * Redirects must carry refreshed auth cookies from updateSession.
 * Dropping them causes random logouts / profile_missing loops after JWT refresh.
 */
function redirectWithSession(
  request: NextRequest,
  supabaseResponse: NextResponse,
  absoluteOrPath: string | URL,
) {
  const url =
    typeof absoluteOrPath === "string"
      ? absoluteOrPath.startsWith("http")
        ? new URL(absoluteOrPath)
        : (() => {
            const next = request.nextUrl.clone();
            const parsed = new URL(absoluteOrPath, request.url);
            next.pathname = parsed.pathname;
            next.search = parsed.search;
            return next;
          })()
      : absoluteOrPath;

  const response = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });
  return withPerfHeaders(response);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  startPerfRequest(pathname);

  const { supabaseResponse, user, profileRole } = await updateSession(request, {
    fetchProfileRole: needsProfileRole(pathname),
  });

  if (pathname === "/connect/register" || pathname.startsWith("/connect/register/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/connect";
    url.search = "";
    return redirectWithSession(request, supabaseResponse, url);
  }

  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith("/connect")) {
      url.pathname = "/connect/login";
    } else {
      url.pathname = "/login";
    }
    url.search = "";
    url.searchParams.set("redirect", pathname);
    return redirectWithSession(request, supabaseResponse, url);
  }

  // Authenticated but profile missing — stay on auth pages to recover; never bounce
  // protected ↔ login in a loop (getDashboardPath(null) would send /login → /buyer → /login).
  if (user && !profileRole && isProtectedPath(pathname) && !isAuthPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname);
    url.searchParams.set("error", "profile_missing");
    return redirectWithSession(request, supabaseResponse, url);
  }

  if (user && profileRole) {
    const unauthorizedRedirect = getUnauthorizedRedirect(profileRole, pathname);
    if (unauthorizedRedirect && unauthorizedRedirect !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = unauthorizedRedirect;
      url.search = "";
      return redirectWithSession(request, supabaseResponse, url);
    }
  }

  if (isAdminPath(pathname) && user && profileRole !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = getDashboardPath(profileRole);
    url.search = "";
    return redirectWithSession(request, supabaseResponse, url);
  }

  // Only auto-leave auth pages when role is known. Missing profile must see login recovery UI.
  if (isConnectAuthPage(pathname) && user && profileRole) {
    const redirectTo = sanitizeRedirectPath(
      request.nextUrl.searchParams.get("redirect"),
      getDashboardPath(profileRole),
    );
    return redirectWithSession(
      request,
      supabaseResponse,
      new URL(redirectTo, request.url),
    );
  }

  if (isAuthPage(pathname) && user && profileRole) {
    const redirectTo = sanitizeRedirectPath(
      request.nextUrl.searchParams.get("redirect"),
      getDashboardPath(profileRole),
    );
    return redirectWithSession(
      request,
      supabaseResponse,
      new URL(redirectTo, request.url),
    );
  }

  return withPerfHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    /*
     * Exclude static assets AND Next internals. Keep HTML/RSC + most /api
     * so auth cookies still refresh via getUser().
     */
    "/((?!_next/static|_next/image|favicon.ico|favicon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
