// src/app/velkommen/actions.ts
// NY FIL. Server action der gemmer brugernavn, navn, by og erfaringsniveau og markerer profilen som færdig.

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = {
  error?: string;
  fieldErrors?: Partial<Record<"username" | "display_name" | "city" | "experience_level", string>>;
};

const LEVELS = ["begynder", "oevet", "erfaren", "ekspert"] as const;

export async function saveOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const display_name = String(formData.get("display_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const experience_level = String(formData.get("experience_level") ?? "");

  const fieldErrors: OnboardingState["fieldErrors"] = {};
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    fieldErrors.username = "3–20 tegn. Kun små bogstaver a–z, tal og _.";
  }
  if (display_name.length < 2 || display_name.length > 50) {
    fieldErrors.display_name = "Skriv dit navn (2–50 tegn).";
  }
  if (city.length > 50) {
    fieldErrors.city = "Højst 50 tegn.";
  }
  if (!LEVELS.includes(experience_level as (typeof LEVELS)[number])) {
    fieldErrors.experience_level = "Vælg dit erfaringsniveau.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name,
      city: city || null,
      experience_level,
      onboarded: true,
    })
    .eq("id", userId);

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { username: "Brugernavnet er taget. Prøv et andet." } };
    }
    return { error: "Profilen kunne ikke gemmes. Prøv igen." };
  }

  redirect("/feed");
}
