// src/app/(app)/indstillinger/page.tsx
// OPDATERET ("Slet min konto"). Indstillinger: rediger din profil, log ud og slet konto.

import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./settings-form";
import DeleteAccount from "./delete-account";

export const metadata: Metadata = {
  title: "Indstillinger",
};

export default async function IndstillingerPage() {
  const me = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("bio").eq("id", me.id).single();

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-deep-900">Indstillinger</h1>
        <Link href={`/u/${me.username}`} className="text-sm font-medium text-deep-700 hover:underline">
          Se min profil
        </Link>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100 sm:p-6">
        <h2 className="mb-5 font-semibold text-deep-900">Profil</h2>
        <SettingsForm
          profile={{
            id: me.id,
            username: me.username,
            display_name: me.display_name,
            city: me.city,
            experience_level: me.experience_level,
            bio: data?.bio ?? null,
            avatar_url: me.avatar_url,
          }}
        />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100 sm:p-6">
        <h2 className="mb-3 font-semibold text-deep-900">Konto</h2>
        <form action="/auth/signout" method="post">
          <button type="submit" className="rounded-lg bg-mist-100 px-4 py-2 text-sm font-semibold text-deep-900 hover:bg-mist-50">
            Log ud
          </button>
        </form>
        <div className="mt-5 border-t border-mist-100 pt-5">
          <h3 className="mb-1 text-sm font-semibold text-deep-900">Slet konto</h3>
          <p className="mb-3 text-sm text-deep-700">
            Sletter din profil og alt, du har delt på HookedSpace.{" "}
            <Link href="/privatliv" className="underline">
              Læs mere
            </Link>
          </p>
          <DeleteAccount />
        </div>
      </section>
    </main>
  );
}
