import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

function serviceRoleConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

/** Server-only Supabase client that bypasses RLS (requires SUPABASE_SERVICE_ROLE_KEY). */
export function createSupabaseServiceClient(): SupabaseClient {
  const config = serviceRoleConfig();
  if (!config) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it from Supabase Dashboard → Settings → API → service_role key.",
    );
  }

  if (!serviceClient) {
    serviceClient = createClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serviceClient;
}

/**
 * Same as createSupabaseServiceClient but never throws — returns null when
 * the service role key is missing so booking can soft-fail secondary steps.
 */
export function tryCreateSupabaseServiceClient(): SupabaseClient | null {
  try {
    if (!serviceRoleConfig()) return null;
    return createSupabaseServiceClient();
  } catch (err) {
    console.error(
      "tryCreateSupabaseServiceClient:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
