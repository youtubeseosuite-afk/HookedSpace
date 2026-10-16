// src/app/(app)/grupper/ny/page.tsx
// NY FIL. Siden "Opret gruppe".

import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import GroupForm from "./group-form";

export const metadata: Metadata = {
  title: "Opret gruppe",
};

export default async function NyGruppePage() {
  const me = await requireProfile();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-deep-900">Opret gruppe</h1>
        <Link href="/grupper" className="text-sm font-medium text-deep-700 hover:underline">
          Annuller
        </Link>
      </div>
      <GroupForm userId={me.id} />
    </main>
  );
}
