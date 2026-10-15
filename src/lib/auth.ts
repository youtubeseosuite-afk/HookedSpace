// src/lib/auth.ts
// NY FIL. Henter den indloggede brugers profil. requireProfile() sender til /login eller /velkommen, hvis det er nødvendigt.

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  experience_level: string | null;
};

// cache() sørger for at profilen kun hentes én gang pr. sidevisning, selv hvis flere komponenter beder om den
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { userId: null, profile: null };

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, city, experience_level, onboarded")
    .eq("id", userId)
    .single();

  return { userId, profile: data };
});

export async function requireProfile(): Promise<CurrentProfile> {
  const { userId, profile } = await getCurrentProfile();
  if (!userId) redirect("/login");
  if (!profile?.onboarded || !profile.username) redirect("/velkommen");

  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name ?? profile.username,
    avatar_url: profile.avatar_url,
    city: profile.city,
    experience_level: profile.experience_level,
  };
}
