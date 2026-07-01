export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  const normalized = normalizeUsername(username);
  if (normalized.length < USERNAME_MIN_LENGTH || normalized.length > USERNAME_MAX_LENGTH) {
    return false;
  }
  return /^[a-z0-9_]+$/.test(normalized);
}

export function looksLikePhoneIdentifier(identifier: string): boolean {
  const digits = identifier.replace(/\D/g, "");
  return digits.length >= 10;
}
