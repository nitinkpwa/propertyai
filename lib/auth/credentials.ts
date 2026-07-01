import type { Session, User } from "@supabase/supabase-js";
import { INVALID_CREDENTIALS_MESSAGE } from "@/lib/auth/errors";
import { mobileToAuthEmail, normalizeMobileNumber } from "@/lib/auth/mobile";
import { fetchProfile, upsertProfile } from "@/lib/auth/profile";
import { normalizeUsername } from "@/lib/auth/username";
import type { Profile } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import type { AccountType } from "@/lib/auth/mobile";

export async function resolveLoginAuthEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return `invalid-${crypto.randomUUID()}@areaiq.app`;
  }

  const { data, error } = await supabase.rpc("resolve_login_email", {
    p_identifier: trimmed,
  });

  if (error) {
    console.error("resolve_login_email failed:", error.message);
    const digits = normalizeMobileNumber(trimmed);
    if (/^[6-9]\d{9}$/.test(digits)) {
      return mobileToAuthEmail(digits);
    }
    return `invalid-${crypto.randomUUID()}@areaiq.app`;
  }

  if (typeof data === "string" && data.includes("@")) {
    return data;
  }

  return `invalid-${crypto.randomUUID()}@areaiq.app`;
}

export async function signInWithIdentifier(
  identifier: string,
  password: string,
): Promise<{ user: User; session: Session; profile: Profile | null }> {
  const authEmail = await resolveLoginAuthEmail(identifier);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error || !data.user || !data.session) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }

  const profile = await fetchProfile(data.user.id);
  return { user: data.user, session: data.session, profile };
}

export async function checkUsernameTaken(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_username_taken", {
    p_username: normalizeUsername(username),
  });
  if (error) {
    console.error("check_username_taken failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function checkPhoneTaken(phone: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_phone_taken", {
    p_phone: normalizeMobileNumber(phone),
  });
  if (error) {
    console.error("check_phone_taken failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function registerAccount(input: {
  fullName: string;
  username: string;
  phone: string;
  password: string;
  role: AccountType;
}): Promise<{ user: User; session: Session; profile: Profile | null }> {
  const normalizedUsername = normalizeUsername(input.username);
  const normalizedPhone = normalizeMobileNumber(input.phone);

  if (await checkUsernameTaken(normalizedUsername)) {
    throw new Error("USERNAME_TAKEN");
  }

  if (await checkPhoneTaken(normalizedPhone)) {
    throw new Error("PHONE_TAKEN");
  }

  const authEmail = mobileToAuthEmail(normalizedPhone);
  const { data, error } = await supabase.auth.signUp({
    email: authEmail,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName.trim(),
        username: normalizedUsername,
        role: input.role,
        phone: normalizedPhone,
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("Registration failed");

  const profile = await upsertProfile({
    user: data.user,
    fullName: input.fullName.trim(),
    username: normalizedUsername,
    role: input.role,
    phone: normalizedPhone,
  });

  if (data.session) {
    return { user: data.user, session: data.session, profile };
  }

  const signedIn = await signInWithIdentifier(normalizedPhone, input.password);
  return { ...signedIn, profile: signedIn.profile ?? profile };
}

export async function changePassword(input: {
  identifier: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await signInWithIdentifier(input.identifier, input.currentPassword);

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (error) throw error;
}
