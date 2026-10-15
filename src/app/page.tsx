// src/app/page.tsx
// NY FIL. Midlertidig forside. Erstattes af landingsside og feed i senere batches.

import { Fish } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-deep-900 px-4 text-center text-mist-50">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-lure-400 text-deep-950">
        <Fish className="h-9 w-9" aria-hidden />
      </div>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">HookedSpace</h1>
      <p className="mt-3 max-w-md text-lg text-reed-300">
        Det sociale netværk for lystfiskere. Vi er snart klar.
      </p>
    </main>
  );
}
