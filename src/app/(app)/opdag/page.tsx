// src/app/(app)/opdag/page.tsx
// NY FIL. "Find fiskere": søg på navn, brugernavn eller by. Uden søgning vises de nyeste medlemmer. Følg direkte fra listen.

import type { Metadata } from "next";
import Link from "next/link";
import { Search, MapPin } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import FollowButton from "@/app/(app)/u/[username]/follow-button";

export const metadata: Metadata = {
  title: "Find fiskere",
};

const LEVEL_LABEL: Record<string, string> = {
  begynder: "Begynder",
  oevet: "Øvet",
  erfaren: "Erfaren",
  ekspert: "Ekspert",
};

type Person = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  experience_level: string | null;
};

export default async function OpdagPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireProfile();
  const { q } = await searchParams;

  // Fjern tegn der har betydning i søgefilteret
  const term = (q ?? "").replace(/[,()*%\\]/g, " ").trim().slice(0, 50);

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, city, experience_level")
    .eq("onboarded", true)
    .neq("id", me.id)
    .limit(30);

  query = term
    ? query.or(`username.ilike.*${term}*,display_name.ilike.*${term}*,city.ilike.*${term}*`).order("display_name")
    : query.order("created_at", { ascending: false });

  const { data } = await query;
  const people = (data ?? []) as Person[];
  const ids = people.map((p) => p.id);

  let iFollow = new Set<string>();
  let followsMe = new Set<string>();
  if (ids.length > 0) {
    const [a, b] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", me.id).in("following_id", ids),
      supabase.from("follows").select("follower_id").eq("following_id", me.id).in("follower_id", ids),
    ]);
    iFollow = new Set((a.data ?? []).map((r) => r.following_id));
    followsMe = new Set((b.data ?? []).map((r) => r.follower_id));
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-deep-900">Find fiskere</h1>

      <form action="/opdag" method="get" className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-mist-100 bg-white px-3 focus-within:border-deep-700">
          <Search className="h-5 w-5 text-deep-700" aria-hidden />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Navn, brugernavn eller by"
            aria-label="Søg efter fiskere"
            className="w-full bg-transparent py-2.5 text-deep-950 outline-none"
          />
        </div>
        <button type="submit" className="rounded-lg bg-deep-900 px-4 text-sm font-semibold text-mist-50 hover:bg-deep-800">
          Søg
        </button>
      </form>

      <p className="text-sm text-deep-700">
        {term ? `Resultater for "${term}"` : "Nyeste medlemmer"}
      </p>

      {people.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-deep-700 shadow-sm ring-1 ring-mist-100">
          {term ? "Ingen fiskere matcher din søgning." : "Der er ingen andre medlemmer endnu."}
        </div>
      ) : (
        <ul className="divide-y divide-mist-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
          {people.map((p) => {
            const name = p.display_name ?? p.username;
            return (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <Link href={`/u/${p.username}`} className="shrink-0">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-reed-500 text-lg font-semibold text-white">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${p.username}`} className="block truncate font-semibold text-deep-950 hover:underline">
                    {name}
                  </Link>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-deep-700">
                    <span>@{p.username}</span>
                    {p.city && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {p.city}
                      </span>
                    )}
                    {p.experience_level && <span>{LEVEL_LABEL[p.experience_level]}</span>}
                    {followsMe.has(p.id) && !iFollow.has(p.id) && <span className="font-medium text-deep-900">Følger dig</span>}
                  </p>
                </div>
                <FollowButton
                  myId={me.id}
                  targetId={p.id}
                  initiallyFollowing={iFollow.has(p.id)}
                  followsMe={followsMe.has(p.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
