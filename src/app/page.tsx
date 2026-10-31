// src/app/page.tsx
// OPDATERET (nyt navn: FiskoMan). Offentlig forside for FiskoMan. Loggede brugere sendes direkte til feedet.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, Trophy, Users, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoBadge } from "@/components/logo";

const FEATURES = [
  {
    icon: Camera,
    title: "Del dine ture",
    text: "Billeder, historier og fangster fra vandet. Tag dine fiskevenner med i opslaget.",
  },
  {
    icon: Trophy,
    title: "Byg din trofævæg",
    text: "Sæt dine bedste fisk på profilen med art, vægt og længde.",
  },
  {
    icon: Users,
    title: "Find andre fiskere",
    text: "Følg lystfiskere fra din egen by eller fra hele landet.",
  },
  {
    icon: ShieldCheck,
    title: "Dine pladser er dine",
    text: "Vi fjerner GPS-data fra alle billeder, før de bliver gemt. Du bestemmer selv, hvem der ser hvad.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/feed");

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top */}
      <header className="bg-deep-900">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-mist-50">
            <LogoBadge size="md" />
            FiskoMan
          </Link>
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800">
            Log ind
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-deep-900 px-4 pb-20 pt-12 text-center sm:pt-20">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-mist-50 sm:text-6xl">
          Det sociale netværk for lystfiskere
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-reed-300">
          Del dine oplevelser ved vandet, vis dine fangster frem og find andre, der er lige så bidt af det som dig.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="w-full rounded-lg bg-lure-400 px-6 py-3 font-semibold text-deep-950 transition hover:bg-lure-500 sm:w-auto"
          >
            Opret gratis profil
          </Link>
          <Link
            href="/login"
            className="w-full rounded-lg px-6 py-3 font-semibold text-mist-50 ring-1 ring-deep-700 transition hover:bg-deep-800 sm:w-auto"
          >
            Jeg har allerede en profil
          </Link>
        </div>
      </section>

      {/* Funktioner */}
      <section className="flex-1 px-4 py-16">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-deep-900 text-lure-400">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-4 font-semibold text-deep-950">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-deep-700">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bund */}
      <footer className="border-t border-mist-100 px-4 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-sm text-deep-700 sm:flex-row">
          <p>© {new Date().getFullYear()} FiskoMan</p>
          <nav className="flex gap-4">
            <Link href="/faq" className="hover:underline">
              FAQ
            </Link>
            <Link href="/regler" className="hover:underline">
              Regler
            </Link>
            <Link href="/privatliv" className="hover:underline">
              Privatlivspolitik
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
