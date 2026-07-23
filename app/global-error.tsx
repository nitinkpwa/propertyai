"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AreaIQ:global]", error.message, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: "#fafafa",
          color: "#111",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 420 }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 1.25rem",
              borderRadius: 16,
              background: "#f3faef",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 0.5rem" }}>
            AreaIQ needs a moment
          </h1>
          <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
            A critical error stopped the page from loading. Reload to recover — you will not lose
            your account.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#4aaa27",
                color: "#fff",
                border: "none",
                padding: "12px 20px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "#fff",
                color: "#111",
                border: "1px solid #e5e7eb",
                padding: "12px 20px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload page
            </button>
            <a
              href="/"
              style={{
                color: "#326f1a",
                fontSize: 14,
                fontWeight: 600,
                padding: "12px 12px",
                textDecoration: "none",
              }}
            >
              Go Home
            </a>
          </div>
          {error.digest ? (
            <p style={{ marginTop: 24, fontSize: 11, color: "#9ca3af" }}>Ref: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
