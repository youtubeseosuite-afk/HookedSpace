// src/app/login/page.tsx
// OPDATERET (nyt logo). Login-side. Læser ?next= og ?fejl= fra URL'en og viser login-formularen.

import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "./login-form";
import { LogoBadge } from "@/components/logo";

export const metadata: Metadata = {
  title: "Log ind",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fejl?: string }>;
}) {
  const { next, fejl } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/feed";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-deep-900 px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-3 text-mist-50">
        <LogoBadge size="lg" />
        <span className="text-2xl font-bold tracking-tight">HookedSpace</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <LoginForm next={safeNext} callbackError={fejl === "login"} />
      </div>

      <p className="mt-6 max-w-sm text-center text-sm text-reed-300">
        Det sociale netværk for lystfiskere.
      </p>
    </main>
  );
}
