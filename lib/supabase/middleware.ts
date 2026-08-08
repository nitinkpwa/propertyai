import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { recordPerf, timed } from "@/lib/perf/timing";

export type UpdateSessionOptions = {
  /**
   * When false, skip the profiles.role round-trip.
   * Safe for public routes that do not need role gates or auth-page redirects.
   */
  fetchProfileRole?: boolean;
};

export async function updateSession(
  request: NextRequest,
  options: UpdateSessionOptions = {},
) {
  const t0 = performance.now();
  const fetchProfileRole = options.fetchProfileRole !== false;
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
            supabaseResponse.cookies.set(name, value, cookieOptions);
          });
        },
      },
    },
  );

  // Required by @supabase/ssr to refresh auth cookies — keep on all routes.
  const {
    data: { user },
  } = await timed("middleware.auth.getUser", () => supabase.auth.getUser());

  let profileRole: string | null = null;
  if (user && fetchProfileRole) {
    const { data: profile, error: profileError } = await timed(
      "middleware.profiles.selectRole",
      async () =>
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle(),
    );
    if (profileError) {
      console.error(
        "[middleware] profiles.role lookup failed:",
        profileError.message,
        { userId: user.id, path: request.nextUrl.pathname },
      );
    }
    profileRole = profile?.role ?? null;
  }

  recordPerf("middleware.updateSession.total", performance.now() - t0, {
    authenticated: Boolean(user),
    hasRole: Boolean(profileRole),
    fetchProfileRole,
    path: request.nextUrl.pathname,
  });

  return { supabaseResponse, user, profileRole };
}
