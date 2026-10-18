// src/lib/supabase/admin.ts
// NY FIL. Kun til admin-siden. Supabase-klient med service role-nøglen (omgår Row Level Security)
// og requireSiteAdmin(), som sikrer at kun platform-admins (tabellen site_admins) kommer ind.
// MÅ ALDRIG importeres i en "use client"-komponent. Nøglen ligger i Vercel som SUPABASE_SERVICE_ROLE_KEY.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Admin-klienten må kun bruges på serveren");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY mangler i Vercel");
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SiteAdmin = { id: string; username: string; display_name: string };

// Kun platform-admins. Alle andre (også ikke-loggede) får "siden findes ikke", så admin-siden ikke afslører sig selv.
export async function requireSiteAdmin(): Promise<SiteAdmin> {
  const { userId, profile } = await getCurrentProfile();
  if (!userId || !profile) notFound();

  const admin = createAdminClient();
  const { data } = await admin.from("site_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!data) notFound();

  return {
    id: userId,
    username: profile.username ?? "",
    display_name: profile.display_name ?? profile.username ?? "Admin",
  };
}
