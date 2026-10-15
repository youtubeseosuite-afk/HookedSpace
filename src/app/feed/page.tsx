// src/app/feed/page.tsx
// OPDATERET. Midlertidig feed-side. Sender nu brugere uden færdig profil til /velkommen.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, onboarded")
    .eq("id", userId)
    .single();

  if (!profile?.onboarded) redirect("/velkommen");

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-deep-900">Feed</h1>
      <p className="mt-2 text-deep-700">
        Hej <strong>{profile.display_name}</strong> (@{profile.username}). Feedet kommer snart.
      </p>
      <form action="/auth/signout" method="post" className="mt-6">
        <button
          type="submit"
          className="rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800"
        >
          Log ud
        </button>
      </form>
    </main>
  );
}
