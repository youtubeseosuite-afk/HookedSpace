// src/app/velkommen/page.tsx
// OPDATERET (nyt navn: FiskoMan). Velkomstside efter første login. Brugere med færdig profil sendes videre til feedet.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";
import { LogoBadge } from "@/components/logo";

export const metadata: Metadata = {
  title: "Velkommen",
};

export default async function VelkommenPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarded")
    .eq("id", userId)
    .single();

  if (profile?.onboarded) redirect("/feed");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-deep-900 px-4 py-10">
      <LogoBadge size="xl" className="mb-6" />
      <h1 className="text-center text-2xl font-bold text-mist-50 sm:text-3xl">Velkommen til FiskoMan</h1>
      <p className="mt-2 max-w-sm text-center text-reed-300">
        Fortæl lidt om dig selv, så andre lystfiskere kan finde dig.
      </p>

      <div className="mt-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <OnboardingForm defaultName={profile?.display_name ?? ""} />
      </div>
    </main>
  );
}
