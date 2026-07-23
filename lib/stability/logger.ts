/**
 * Lightweight logger — verbose only in development.
 * Critical failures always emit a single console.error in production
 * so operators can see crashes without spamming clients.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = process.env.NODE_ENV === "development";

function emit(level: LogLevel, scope: string, message: string, detail?: unknown) {
  if (!isDev && level !== "error") return;

  const prefix = `[AreaIQ:${scope}]`;
  const args = detail === undefined ? [prefix, message] : [prefix, message, detail];

  switch (level) {
    case "debug":
      console.debug(...args);
      break;
    case "info":
      console.info(...args);
      break;
    case "warn":
      console.warn(...args);
      break;
    case "error":
      console.error(...args);
      break;
  }
}

export const logger = {
  debug: (scope: string, message: string, detail?: unknown) =>
    emit("debug", scope, message, detail),
  info: (scope: string, message: string, detail?: unknown) =>
    emit("info", scope, message, detail),
  warn: (scope: string, message: string, detail?: unknown) =>
    emit("warn", scope, message, detail),
  error: (scope: string, message: string, detail?: unknown) =>
    emit("error", scope, message, detail),
};

export function isFatalAuthError(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("invalid refresh token") ||
    m.includes("refresh_token_not_found") ||
    m.includes("refresh token not found") ||
    m.includes("invalid jwt") ||
    m.includes("jwt expired") ||
    m.includes("session from session_id claim in jwt does not exist") ||
    m.includes("user from sub claim in jwt does not exist")
  );
}
