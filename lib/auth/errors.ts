export function getAuthErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "Something went wrong. Please try again.";

  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "Wrong mobile number or password. Please try again.";
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered")
  ) {
    return "This mobile number is already registered. Please sign in instead.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please check your email and confirm your account before signing in.";
  }

  if (
    normalized.includes("password should be at least") ||
    normalized.includes("weak password")
  ) {
    return "Password must be at least 8 characters and include letters and numbers.";
  }

  if (
    normalized.includes("network") ||
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch")
  ) {
    return "Network error. Check your connection and try again.";
  }

  if (normalized.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (normalized.includes("same as the old password")) {
    return "Choose a password that is different from your current one.";
  }

  return message;
}
