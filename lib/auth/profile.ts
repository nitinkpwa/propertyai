import type { User } from "@supabase/supabase-js";
import { supabase, type Profile } from "@/lib/supabase";
import { mobileToAuthEmail, normalizeMobileNumber } from "@/lib/auth/mobile";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch profile:", error.message);
    return null;
  }

  return data;
}

export async function upsertProfile(input: {
  user: User;
  fullName: string;
  role?: Profile["role"];
  phone?: string;
}): Promise<Profile | null> {
  const normalizedPhone = input.phone
    ? normalizeMobileNumber(input.phone)
    : (input.user.user_metadata?.phone as string | undefined)
      ? normalizeMobileNumber(String(input.user.user_metadata.phone))
      : "";

  const payload = {
    id: input.user.id,
    email: input.user.email ?? (normalizedPhone ? mobileToAuthEmail(normalizedPhone) : ""),
    full_name: input.fullName.trim(),
    phone: normalizedPhone,
    role: input.role ?? (input.user.user_metadata?.role as Profile["role"]) ?? "buyer",
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to upsert profile:", error.message);
    return fetchProfile(input.user.id);
  }

  return data;
}

export function getDashboardPath(role?: Profile["role"] | null): string {
  switch (role) {
    case "seller":
    case "broker":
      return "/seller";
    case "builder":
      return "/builder";
    default:
      return "/buyer";
  }
}

export function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "U";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
