// src/app/admin/layout.tsx
// NY FIL. Layout for admin-siden: egen topbar og menu, og noindex så Google aldrig indekserer siderne.
// Kun platform-admins kommer ind (ellers 404). Senere kan admin.hookedspace.com pege hertil.

import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { requireSiteAdmin } from "@/lib/supabase/admin";
import AdminNav from "./admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · HookedSpace Admin" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSiteAdmin();

  return (
    <div className="min-h-dvh bg-mist-50">
      <header className="sticky top-0 z-40 bg-deep-950 text-mist-50 shadow">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
              <ShieldAlert className="h-5 w-5" aria-hidden />
            </span>
            <span>
              HookedSpace <span className="text-red-400">Admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-reed-300 sm:inline">{admin.display_name}</span>
            <Link href="/feed" className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium hover:bg-deep-800">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Til siden
            </Link>
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
