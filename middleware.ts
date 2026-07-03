import { type NextRequest, NextResponse } from "next/server";
import { getDashboardPath, getUnauthorizedRedirect } from "@/lib/auth/routes";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/buyer",
  "/seller",
  "/builder",
  "/profile",
  "/connect/dashboard",
];
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];
const CONNECT_AUTH_PAGES = ["/connect/login", "/connect/register"];

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

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, profileRole } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith("/connect")) {
      url.pathname = "/connect/login";
    } else {
      url.pathname = "/login";
    }
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && profileRole) {
    const unauthorizedRedirect = getUnauthorizedRedirect(profileRole, pathname);
    if (unauthorizedRedirect && unauthorizedRedirect !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = unauthorizedRedirect;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (isAdminPath(pathname) && user && profileRole !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = getDashboardPath(profileRole);
    return NextResponse.redirect(url);
  }

  if (isConnectAuthPage(pathname) && user) {
    const redirectTo =
      request.nextUrl.searchParams.get("redirect") ??
      getDashboardPath(profileRole);
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  if (isAuthPage(pathname) && user) {
    const redirectTo =
      request.nextUrl.searchParams.get("redirect") ??
      getDashboardPath(profileRole);
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
