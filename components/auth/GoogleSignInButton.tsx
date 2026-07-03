"use client";

import { useState } from "react";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { buildAuthCallbackUrl } from "@/lib/auth/redirects";
import { supabase } from "@/lib/supabase/client";
import AuthButton from "./AuthButton";

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl(),
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div>
      {error ? (
        <p className="mb-3 text-center text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
      <AuthButton
        type="button"
        loading={loading}
        loadingText="Redirecting..."
        onClick={handleGoogleSignIn}
        className="border border-neutral-200 bg-white text-neutral-800 shadow-sm hover:brightness-100"
        style={{ backgroundColor: "#ffffff", color: "#171717" }}
      >
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#EA4335"
              d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.8 3.7 14.6 2.8 12 2.8 7.5 2.8 3.9 6.4 3.9 10.9S7.5 19 12 19c4.4 0 7.3-3.1 7.3-7.5 0-.5 0-.9-.1-1.3H12z"
            />
          </svg>
          Continue with Google
        </span>
      </AuthButton>
    </div>
  );
}
