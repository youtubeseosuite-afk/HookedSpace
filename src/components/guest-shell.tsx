// src/components/guest-shell.tsx
// NY FIL. Rammen for gæster (ikke logget ind): topbar med Log ind / Opret profil,
// og en fast bjælke i bunden der opfordrer til at oprette en profil. Kun gæster ser den.

import Link from "next/link";
import { LogoBadge } from "@/components/logo";
import { JoinPromptHost } from "@/components/join-prompt";

export function GuestCtaBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-deep-800 bg-deep-900 px-4 py-3 text-mist-50 shadow-[0_-8px_24px_rgba(6,20,27,0.25)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <p className="min-w-0 text-sm leading-snug">
          <span className="block font-semibold">Fisker du også?</span>
          <span className="block text-reed-300">Del dine fangster med danske lystfiskere. Det er gratis.</span>
        </p>
        <Link
          href="/login?opret=1"
          className="shrink-0 rounded-lg bg-lure-400 px-4 py-2.5 text-sm font-bold text-deep-950 shadow hover:bg-lure-500"
        >
          Opret profil
        </Link>
      </div>
    </div>
  );
}

export default function GuestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-40 bg-deep-900 text-mist-50 shadow">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/feed" className="flex items-center gap-2 font-bold">
            <LogoBadge size="sm" />
            FiskoMan
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-deep-800">
              Log ind
            </Link>
            <Link
              href="/login?opret=1"
              className="rounded-lg bg-lure-400 px-3 py-1.5 text-sm font-bold text-deep-950 hover:bg-lure-500"
            >
              Opret profil
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <GuestCtaBar />
      <JoinPromptHost />
    </div>
  );
}
