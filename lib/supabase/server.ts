import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { timed } from "@/lib/perf/timing";

/**
 * One Supabase server client per request (React cache).
 * Avoids duplicate cookie/client construction across layout + page + helpers.
 */
export const createSupabaseServerClient = cache(async () => {
  return timed("supabase.createServerClient", async () => {
    const cookieStore = await cookies();

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Called from a Server Component — ignore
            }
          },
        },
      },
    );
  });
});

/** Deduped JWT validation within a single request. */
export const getAuthenticatedUser = cache(async () => {
  return timed("auth.getAuthenticatedUser", async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
  });
});
