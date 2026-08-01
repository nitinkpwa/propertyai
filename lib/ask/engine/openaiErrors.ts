/** Classify OpenAI / transport failures for logging and retry policy. */

export type OpenAIErrorKind =
  | "timeout"
  | "rate_limit"
  | "token"
  | "api"
  | "abort"
  | "empty"
  | "unknown";

export type ClassifiedOpenAIError = {
  kind: OpenAIErrorKind;
  retryable: boolean;
  message: string;
  status: number | null;
};

export const OPENAI_RETRY_DELAYS_MS = [1000, 3000, 8000] as const;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function classifyOpenAIError(error: unknown): ClassifiedOpenAIError {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { kind: "abort", retryable: false, message: "aborted", status: null };
  }

  const message =
    error instanceof Error ? error.message : String(error ?? "unknown error");
  const lower = message.toLowerCase();

  const statusMatch = message.match(/HTTP\s+(\d{3})/i);
  const status = statusMatch ? Number(statusMatch[1]) : null;

  if (
    lower.includes("abort") ||
    lower.includes("aborted") ||
    (error instanceof Error && error.name === "AbortError")
  ) {
    return { kind: "abort", retryable: false, message, status };
  }

  if (
    status === 429 ||
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("too many requests")
  ) {
    return { kind: "rate_limit", retryable: true, message, status: status ?? 429 };
  }

  if (
    status === 401 ||
    status === 403 ||
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("authentication") ||
    (lower.includes("token") &&
      (lower.includes("invalid") || lower.includes("expired")))
  ) {
    return { kind: "token", retryable: false, message, status };
  }

  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("etimedout") ||
    lower.includes("econnreset") ||
    lower.includes("fetch failed") ||
    lower.includes("network")
  ) {
    return { kind: "timeout", retryable: true, message, status };
  }

  if (lower.includes("empty")) {
    return { kind: "empty", retryable: true, message, status };
  }

  if (status != null && status >= 500) {
    return { kind: "api", retryable: true, message, status };
  }

  if (status != null && status >= 400) {
    return { kind: "api", retryable: status === 408 || status === 409, message, status };
  }

  return { kind: "unknown", retryable: true, message, status };
}
