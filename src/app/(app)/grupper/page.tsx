// src/app/(app)/grupper/page.tsx
// NY FIL. Gruppeoversigt: dine grupper (med antal ventende anmodninger, hvis du er admin),
// dine afventende anmodninger, og søgning efter andre grupper.

import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Users, Lock, Globe, MapPin, Shield } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Grupper",
};

type Group = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  privacy: "public" | "private";
  member_count: number;
};

type Membership = {
  role: "admin" | "member";
  status: "pending" | "active";
  group: Group | null;
};

function GroupRow({ group, extra }: { group: Group; extra?: React.ReactNode }) {
  const PrivacyIcon = group.privacy === "private" ? Lock : Globe;
  return (
    <li>
      <Link href={`/g/${group.slug}`} className="flex items-center gap-3 p-4 transition hover:bg-mist-50">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-deep-900 text-lg font-bold text-lure-400">
          {group.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-deep-950">{group.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-deep-700">
            <span className="flex items-center gap-1">
              <PrivacyIcon className="h-3 w-3" aria-hidden />
              {group.privacy === "private" ? "Privat" : "Offentlig"}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden />
              {group.member_count} {group.member_count === 1 ? "medlem" : "medlemmer"}
            </span>
            {group.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden />
                {group.city}
              </span>
            )}
          </span>
        </span>
        {extra}
      </Link>
    </li>
  );
}

export default async function GrupperPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireProfile();
  const { q } = await searchParams;
  const term = (q ?? "").replace(/[,()*%\\]/g, " ").trim().slice(0, 50);
  const supabase = await createClient();

  const { data: membershipData } = await supabase
    .from("group_members")
    .select("role, status, group:groups ( id, slug, name, description, city, privacy, member_count )")
    .eq("user_id", me.id);

  const memberships = ((membershipData ?? []) as unknown as Membership[]).filter((m) => m.group);
  const active = memberships.filter((m) => m.status === "active");
  const pending = memberships.filter((m) => m.status === "pending");
  const adminGroupIds = active.filter((m) => m.role === "admin").map((m) => m.group!.id);
  const myGroupIds = new Set(memberships.map((m) => m.group!.id));

  // Ventende anmodninger i grupper hvor jeg er admin
  const pendingCounts = new Map<string, number>();
  if (adminGroupIds.length > 0) {
    const { data: reqs } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("status", "pending")
      .in("group_id", adminGroupIds);
    for (const r of reqs ?? []) pendingCounts.set(r.group_id, (pendingCounts.get(r.group_id) ?? 0) + 1);
  }

  // Find grupper
  let discoverQuery = supabase
    .from("groups")
    .select("id, slug, name, description, city, privacy, member_count")
    .order("member_count", { ascending: false })
    .limit(30);
  if (term) discoverQuery = discoverQuery.or(`name.ilike.*${term}*,city.ilike.*${term}*,description.ilike.*${term}*`);
  const { data: discoverData } = await discoverQuery;
  const discover = ((discoverData ?? []) as Group[]).filter((g) => !myGroupIds.has(g.id));

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-deep-900">Grupper</h1>
        <Link
          href="/grupper/ny"
          className="flex items-center gap-2 rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Opret gruppe
        </Link>
      </div>

      {/* Mine grupper */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-deep-700">Mine grupper</h2>
        {active.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-deep-700 shadow-sm ring-1 ring-mist-100">
            Du er ikke med i nogen grupper endnu. Find en nedenfor, eller opret din egen.
          </div>
        ) : (
          <ul className="divide-y divide-mist-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
            {active.map((m) => {
              const count = pendingCounts.get(m.group!.id) ?? 0;
              return (
                <GroupRow
                  key={m.group!.id}
                  group={m.group!}
                  extra={
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {m.role === "admin" && (
                        <span className="flex items-center gap-1 rounded-full bg-deep-900 px-2 py-0.5 text-[11px] font-semibold text-lure-400">
                          <Shield className="h-3 w-3" aria-hidden />
                          Admin
                        </span>
                      )}
                      {count > 0 && (
                        <span className="rounded-full bg-lure-400 px-2 py-0.5 text-[11px] font-bold text-deep-950">
                          {count} {count === 1 ? "anmodning" : "anmodninger"}
                        </span>
                      )}
                    </span>
                  }
                />
              );
            })}
          </ul>
        )}
      </section>

      {/* Afventer godkendelse */}
      {pending.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-deep-700">Afventer godkendelse</h2>
          <ul className="divide-y divide-mist-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
            {pending.map((m) => (
              <GroupRow
                key={m.group!.id}
                group={m.group!}
                extra={<span className="shrink-0 text-xs font-medium text-deep-700">Afventer</span>}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Find grupper */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-deep-700">Find grupper</h2>
        <form action="/grupper" method="get" className="mb-3 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-mist-100 bg-white px-3 focus-within:border-deep-700">
            <Search className="h-5 w-5 text-deep-700" aria-hidden />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Navn, by eller emne"
              aria-label="Søg efter grupper"
              className="w-full bg-transparent py-2.5 text-deep-950 outline-none"
            />
          </div>
          <button type="submit" className="rounded-lg bg-deep-900 px-4 text-sm font-semibold text-mist-50 hover:bg-deep-800">
            Søg
          </button>
        </form>

        {discover.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-deep-700 shadow-sm ring-1 ring-mist-100">
            {term ? "Ingen grupper matcher din søgning." : "Der er ingen andre grupper endnu."}
          </div>
        ) : (
          <ul className="divide-y divide-mist-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
            {discover.map((g) => (
              <GroupRow key={g.id} group={g} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
