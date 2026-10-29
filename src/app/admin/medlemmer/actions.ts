// src/app/admin/medlemmer/actions.ts
// NY FIL. Server actions til admin: bortvis (ban) og genåbn (unban) en bruger.
// Ban gemmes i user_bans (skjuler indhold og blokerer opslag via RLS) OG i Supabase Auth,
// så brugeren heller ikke kan logge ind igen, før ban'en udløber.

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, requireSiteAdmin } from "@/lib/supabase/admin";

export type BanState = { ok?: string; error?: string };

const DURATIONS: Record<string, number | null> = {
  "1": 1,
  "7": 7,
  "30": 30,
  perm: null, // permanent
};

function refresh(userId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/medlemmer");
  revalidatePath(`/admin/medlemmer/${userId}`);
  revalidatePath("/admin/bans");
}

export async function banUser(_prev: BanState, formData: FormData): Promise<BanState> {
  const admin = await requireSiteAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const duration = String(formData.get("duration") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId) return { error: "Bruger mangler." };
  if (!(duration in DURATIONS)) return { error: "Vælg en varighed." };
  if (reason.length < 3) return { error: "Skriv en begrundelse (mindst 3 tegn)." };
  if (reason.length > 500) return { error: "Begrundelsen må højst være 500 tegn." };
  if (userId === admin.id) return { error: "Du kan ikke bortvise dig selv." };

  const db = createAdminClient();

  const { data: isAdmin } = await db.from("site_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (isAdmin) return { error: "Du kan ikke bortvise en anden admin. Fjern admin-rettigheden først." };

  const days = DURATIONS[duration];
  const now = new Date();
  const bannedUntil = days === null ? null : new Date(now.getTime() + days * 86_400_000).toISOString();

  const { error } = await db.from("user_bans").upsert(
    {
      user_id: userId,
      banned_at: now.toISOString(),
      banned_until: bannedUntil,
      reason,
      banned_by: admin.id,
    },
    { onConflict: "user_id" }
  );
  if (error) return { error: "Ban kunne ikke gemmes. Prøv igen." };

  // Spær også login. Permanent = 100 år.
  const { error: authError } = await db.auth.admin.updateUserById(userId, {
    ban_duration: days === null ? "876000h" : `${days * 24}h`,
  });

  refresh(userId);
  if (authError) {
    return {
      ok: "Brugeren er bortvist på siden, men login kunne ikke spærres i Supabase Auth. Brugeren sendes stadig til bortvist-siden.",
    };
  }
  return { ok: days === null ? "Brugeren er bortvist permanent." : `Brugeren er bortvist i ${days} ${days === 1 ? "dag" : "dage"}.` };
}

export async function unbanUser(_prev: BanState, formData: FormData): Promise<BanState> {
  await requireSiteAdmin();
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "Bruger mangler." };

  const db = createAdminClient();
  const { error } = await db.from("user_bans").delete().eq("user_id", userId);
  if (error) return { error: "Ban kunne ikke fjernes. Prøv igen." };

  const { error: authError } = await db.auth.admin.updateUserById(userId, { ban_duration: "none" });

  refresh(userId);
  if (authError) return { ok: "Ban er fjernet på siden, men login-spærringen i Supabase Auth kunne ikke fjernes." };
  return { ok: "Ban er fjernet. Brugeren kan logge ind igen." };
}
