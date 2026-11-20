// src/app/(app)/auktioner/ny/page.tsx
// NY FIL. Siden "Sælg dit grej" på GrejAuktionen. Kræver login (gæster sendes til opret profil).

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile, requireProfile } from "@/lib/auth";
import AuctionForm from "./auction-form";

export const metadata: Metadata = {
  title: "Sælg dit grej",
  robots: { index: false, follow: false },
};

export default async function NewAuctionPage() {
  const { userId } = await getCurrentProfile();
  if (!userId) redirect("/login?opret=1&next=/auktioner/ny");
  const profile = await requireProfile();

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
      <Link href="/auktioner" className="inline-flex items-center gap-1 text-sm font-medium text-deep-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> GrejAuktionen
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-deep-900">Sælg dit grej</h1>
        <p className="text-sm text-deep-700">
          Sæt brugt fiskegrej på auktion. Når auktionen slutter, kan du og vinderen skrive sammen og aftale betaling og afhentning.
        </p>
      </div>
      <AuctionForm userId={profile.id} defaultCity={profile.city} />
    </main>
  );
}
