import type { User } from "@supabase/supabase-js";
import { upsertProfile } from "@/lib/auth/profile";
import { supabase, type Profile } from "@/lib/supabase";

export async function upsertBuilderProfile(input: {
  user: User;
  companyName: string;
  builderName: string;
  username?: string;
  phone: string;
  email: string;
  city: string;
  gst?: string;
  reraNumber?: string;
}): Promise<Profile | null> {
  const base = await upsertProfile({
    user: input.user,
    fullName: input.builderName.trim(),
    username: input.username,
    role: "builder",
    phone: input.phone,
  });

  if (!base) return null;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      company: input.companyName.trim(),
      email: input.email.trim(),
      city: input.city.trim(),
      gst: input.gst?.trim() || null,
      rera_number: input.reraNumber?.trim() || null,
    })
    .eq("id", input.user.id)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update builder profile:", error.message);
    return base;
  }

  return data as Profile;
}
