// src/app/(app)/indstillinger/actions.ts
// NY FIL. Server action der gemmer ændringer til profilen: navn, brugernavn, by, erfaringsniveau og bio.

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"username" | "display_name" | "city" | "experience_level" | "bio", string>>;
};

const LEVELS = ["begynder", "oevet", "erfaren", "ekspert"];

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const display_name = String(formData.get("display_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const experience_level = String(formData.get("experience_level") ?? "");
  const bio = String(formData.get("bio") ?? "").trim();

  const fieldErrors: SettingsState["fieldErrors"] = {};
  if (!/^[a-z0-9_]{3,20}$/.test(username)) fieldErrors.username = "3–20 tegn. Kun små bogstaver a–z, tal og _.";
  if (display_name.length < 2 || display_name.length > 50) fieldErrors.display_name = "Skriv dit navn (2–50 tegn).";
  if (city.length > 50) fieldErrors.city = "Højst 50 tegn.";
  if (!LEVELS.includes(experience_level)) fieldErrors.experience_level = "Vælg dit erfaringsniveau.";
  if (bio.length > 500) fieldErrors.bio = "Højst 500 tegn.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { error: "Du er ikke logget ind." };

  const { error } = await supabase
    .from("profiles")
    .update({ username, display_name, city: city || null, experience_level, bio: bio || null })
    .eq("id", userId);

  if (error) {
    if (error.code === "23505") return { fieldErrors: { username: "Brugernavnet er taget. Prøv et andet." } };
    return { error: "Ændringerne kunne ikke gemmes. Prøv igen." };
  }

  // Opdater menu, profil og feed med de nye oplysninger
  revalidatePath("/", "layout");
  return { ok: true };
}
