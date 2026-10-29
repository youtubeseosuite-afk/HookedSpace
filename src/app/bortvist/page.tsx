// src/app/bortvist/page.tsx
// NY FIL. Vises for bortviste brugere: hvor længe, begrundelse og hvordan man kontakter os.
// Er brugeren ikke (længere) bortvist, sendes de til feedet.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban, Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const CONTACT_EMAIL = "kontakt@hookedspace.com";

export const metadata: Metadata = {
  title: "Bortvist",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function dkDateTime(iso: string) {
  return new Date(iso).toLocaleString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  });
}

export default async function BortvistPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const loggedIn = Boolean(claimsData?.claims?.sub);

  let ban: { banned_at: string; banned_until: string | null; reason: string | null } | null = null;
  if (loggedIn) {
    const { data } = await supabase.rpc("my_ban");
    ban = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!ban) redirect("/feed");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-deep-900">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-mist-50">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lure-400 text-deep-950">
              <Fish className="h-5 w-5" aria-hidden />
            </span>
            HookedSpace
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-mist-100">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Ban className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold text-deep-950">Din profil er bortvist</h1>

          {ban ? (
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-deep-800">
              <p>
                {ban.banned_until ? (
                  <>
                    Du er bortvist fra HookedSpace indtil <strong className="text-deep-950">{dkDateTime(ban.banned_until)}</strong>.
                    Derefter kan du logge ind igen.
                  </>
                ) : (
                  <>Du er bortvist permanent fra HookedSpace.</>
                )}
              </p>
              {ban.reason && (
                <div className="rounded-lg bg-mist-50 px-4 py-3 ring-1 ring-mist-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-deep-700">Begrundelse</p>
                  <p className="mt-1 whitespace-pre-line text-deep-950">{ban.reason}</p>
                </div>
              )}
              <p>Mens du er bortvist, er dine opslag og kommentarer skjult for andre.</p>
            </div>
          ) : (
            <p className="mt-3 text-[15px] leading-relaxed text-deep-800">
              Profilen har ikke adgang til HookedSpace lige nu.
            </p>
          )}

          <p className="mt-4 text-[15px] leading-relaxed text-deep-800">
            Mener du, det er en fejl, eller vil du have dine data slettet, så skriv til{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-deep-900 underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>

          {loggedIn && (
            <form action="/auth/signout" method="post" className="mt-6">
              <button className="w-full rounded-lg bg-deep-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-deep-800">
                Log ud
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
