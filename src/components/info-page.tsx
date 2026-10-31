// src/components/info-page.tsx
// NY FIL. Fælles ramme til offentlige infosider (FAQ og regler): topbar med logo, indhold og links i bunden.

import Link from "next/link";
import { LogoBadge } from "@/components/logo";

export default function InfoPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-deep-900">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-mist-50">
            <LogoBadge size="md" />
            HookedSpace
          </Link>
          <Link href="/feed" className="rounded-lg px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800">
            Til feedet
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
        <h1 className="text-3xl font-bold text-deep-950">{title}</h1>
        {intro && <div className="mt-2 text-[15px] leading-relaxed text-deep-800">{intro}</div>}
        <div className="mt-8 space-y-8">{children}</div>
      </main>

      <footer className="border-t border-mist-100 px-4 py-6">
        <nav className="mx-auto flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-deep-700">
          <Link href="/faq" className="hover:underline">
            FAQ
          </Link>
          <Link href="/regler" className="hover:underline">
            Regler
          </Link>
          <Link href="/privatliv" className="hover:underline">
            Privatlivspolitik
          </Link>
          <a href="mailto:kontakt@hookedspace.com" className="hover:underline">
            kontakt@hookedspace.com
          </a>
        </nav>
      </footer>
    </div>
  );
}
