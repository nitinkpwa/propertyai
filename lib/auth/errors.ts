export const INVALID_CREDENTIALS_MESSAGE = "Invalid credentials.";

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "INVALID_CREDENTIALS" || error.message === INVALID_CREDENTIALS_MESSAGE) {
      return INVALID_CREDENTIALS_MESSAGE;
    }
    if (error.message === "USERNAME_TAKEN") {
      return "This username is already taken. Please choose another.";
    }
    if (error.message === "PHONE_TAKEN") {
      return "This phone number is already registered. Please sign in instead.";
    }
  }

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
    return INVALID_CREDENTIALS_MESSAGE;
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("duplicate key") && normalized.includes("phone")
  ) {
    return "This phone number is already registered. Please sign in instead.";
  }

  if (normalized.includes("duplicate key") && normalized.includes("username")) {
    return "This username is already taken. Please choose another.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Your session expired. Please sign in again.";
  }

  if (
    normalized.includes("password should be at least") ||
    normalized.includes("weak password")
  ) {
    return "Password must be at least 8 characters.";
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

  if (normalized.includes("jwt expired") || normalized.includes("session")) {
    return "Your session expired. Please sign in again.";
  }

  return message;
}
