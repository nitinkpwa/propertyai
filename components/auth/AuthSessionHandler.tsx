"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { handleAuthHashFragment, isRecoveryType } from "@/lib/auth/hashSession";
import { supabase } from "@/lib/supabase/client";

/**
 * Captures implicit-flow hash tokens/errors on any page load.
 * PKCE recovery should normally land on /auth/callback?code=... (server route).
 * This handler covers legacy implicit hash redirects to Site URL (/).
 */
export default function AuthSessionHandler() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const hashResult = await handleAuthHashFragment();
      if (cancelled) return;

      if (hashResult.error || hashResult.errorCode) {
        const code = encodeURIComponent(hashResult.errorCode ?? hashResult.error ?? "auth_failed");
        router.replace(`/forgot-password?error=${code}`);
        return;
      }

      if (hashResult.success && isRecoveryType(hashResult.type)) {
        router.replace("/reset-password");
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/reset-password");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
