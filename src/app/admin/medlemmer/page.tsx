// src/app/admin/medlemmer/page.tsx
// NY FIL. Admin: alle medlemmer med aktivitet. Søg på navn, brugernavn eller email,
// filtrér (bortviste, rapporterede, inaktive, admins) og sortér. 50 pr. side.

import type { Metadata } from "next";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { regionLabel } from "@/lib/regions";
import { dkDate, sinceText } from "../format";

export const metadata: Metadata = { title: "Medlemmer" };

const PAGE_SIZE = 50;

const FILTERS = [
  { key: "alle", label: "Alle" },
  { key: "bortviste", label: "Bortviste" },
  { key: "rapporterede", label: "Med åbne rapporter" },
  { key: "inaktive", label: "Inaktive 30+ dage" },
  { key: "nye", label: "Nye (7 dage)" },
  { key: "admins", label: "Admins" },
] as const;

const SORTS = [
  { key: "nyeste", label: "Nyeste" },
  { key: "aktiv", label: "Senest aktiv" },
  { key: "opslag", label: "Flest opslag" },
  { key: "kommentarer", label: "Flest kommentarer" },
  { key: "foelgere", label: "Flest følgere" },
  { key: "rapporter", label: "Flest rapporter" },
] as const;

type Row = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  region: string | null;
  created_at: string;
  posts: number;
  comments: number;
  reactions: number;
  followers: number;
  open_reports: number;
  total_reports: number;
  is_banned: boolean;
  banned_until: string | null;
  is_admin: boolean;
  email: string | null;
  provider: string | null;
  last_active_at: string | null;
};

type SP = { q?: string; filter?: string; sort?: string; side?: string };

function buildHref(base: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  const merged = { ...base, ...patch };
  if (merged.q) p.set("q", merged.q);
  if (merged.filter && merged.filter !== "alle") p.set("filter", merged.filter);
  if (merged.sort && merged.sort !== "nyeste") p.set("sort", merged.sort);
  if (merged.side && merged.side !== "1") p.set("side", merged.side);
  const s = p.toString();
  return `/admin/medlemmer${s ? `?${s}` : ""}`;
}

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  // Fjern tegn der har betydning i søgefilteret
  const q = (sp.q ?? "").replace(/[,()*%\\]/g, " ").trim().slice(0, 80);
  const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter! : "alle";
  const sort = SORTS.some((s) => s.key === sp.sort) ? sp.sort! : "nyeste";
  const page = Math.max(1, Number.parseInt(sp.side ?? "1", 10) || 1);
  const current: SP = { q, filter, sort, side: String(page) };

  const db = createAdminClient();
  let query = db
    .from("admin_member_stats")
    .select(
      "id, username, display_name, avatar_url, city, region, created_at, posts, comments, reactions, followers, open_reports, total_reports, is_banned, banned_until, is_admin, email, provider, last_active_at",
      { count: "exact" }
    );

  if (q) query = query.or(`username.ilike.*${q}*,display_name.ilike.*${q}*,email.ilike.*${q}*,city.ilike.*${q}*`);

  const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const d7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
  if (filter === "bortviste") query = query.eq("is_banned", true);
  if (filter === "rapporterede") query = query.gt("open_reports", 0);
  if (filter === "inaktive") query = query.lt("last_active_at", d30);
  if (filter === "nye") query = query.gt("created_at", d7);
  if (filter === "admins") query = query.eq("is_admin", true);

  if (sort === "nyeste") query = query.order("created_at", { ascending: false });
  if (sort === "aktiv") query = query.order("last_active_at", { ascending: false, nullsFirst: false });
  if (sort === "opslag") query = query.order("posts", { ascending: false });
  if (sort === "kommentarer") query = query.order("comments", { ascending: false });
  if (sort === "foelgere") query = query.order("followers", { ascending: false });
  if (sort === "rapporter") query = query.order("total_reports", { ascending: false });
  query = query.order("id"); // stabil rækkefølge

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-deep-900">
          Medlemmer <span className="text-base font-normal text-deep-700">({total})</span>
        </h1>
        <form action="/admin/medlemmer" className="flex w-full max-w-md gap-2 sm:w-auto">
          {filter !== "alle" && <input type="hidden" name="filter" value={filter} />}
          {sort !== "nyeste" && <input type="hidden" name="sort" value={sort} />}
          <label className="relative flex-1">
            <span className="sr-only">Søg</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-700" aria-hidden />
            <input
              name="q"
              defaultValue={q}
              placeholder="Navn, brugernavn, email eller by"
              className="w-full rounded-lg border border-mist-100 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-deep-700"
            />
          </label>
          <button className="rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-white hover:bg-deep-800">Søg</button>
        </form>
      </div>

      {/* Filtre */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={buildHref(current, { filter: f.key, side: "1" })}
            className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${
              filter === f.key ? "bg-deep-900 text-white ring-deep-900" : "bg-white text-deep-800 ring-mist-100 hover:ring-deep-700"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Sortering */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-deep-700">Sortér:</span>
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={buildHref(current, { sort: s.key, side: "1" })}
            className={sort === s.key ? "font-semibold text-deep-950 underline" : "text-deep-700 hover:underline"}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Kunne ikke hente medlemmer. Har du kørt 014_admin_members.sql? ({error.message})
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-mist-100 bg-mist-50 text-xs uppercase tracking-wide text-deep-700">
            <tr>
              <th className="px-3 py-2 font-semibold">Medlem</th>
              <th className="px-3 py-2 font-semibold">Område</th>
              <th className="px-3 py-2 font-semibold">Oprettet</th>
              <th className="px-3 py-2 font-semibold">Sidst aktiv</th>
              <th className="px-3 py-2 text-right font-semibold">Opslag</th>
              <th className="px-3 py-2 text-right font-semibold">Komm.</th>
              <th className="px-3 py-2 text-right font-semibold">Reakt.</th>
              <th className="px-3 py-2 text-right font-semibold">Følgere</th>
              <th className="px-3 py-2 text-right font-semibold">Rapp.</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-deep-700">
                  Ingen medlemmer matcher.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={`hover:bg-mist-50 ${r.is_banned ? "bg-red-50/50" : ""}`}>
                <td className="px-3 py-2">
                  <Link href={`/admin/medlemmer/${r.id}`} className="flex items-center gap-2">
                    {r.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist-100 text-xs font-bold text-deep-800">
                        {(r.display_name ?? r.email ?? "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-deep-950">
                        {r.display_name ?? "Uden navn"}{" "}
                        <span className="font-normal text-deep-700">{r.username ? `@${r.username}` : "(ikke færdig)"}</span>
                      </span>
                      <span className="block truncate text-xs text-deep-700">
                        {r.email ?? "–"}
                        {r.provider === "google" ? " · Google" : ""}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-deep-800">
                  {r.city ?? "–"}
                  {r.region && <span className="block text-xs text-deep-700">{regionLabel(r.region)}</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-deep-800">{dkDate(r.created_at)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-deep-800">{sinceText(r.last_active_at)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.posts}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.comments}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.reactions}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.followers}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.open_reports > 0 ? (
                    <span className="font-bold text-red-700">
                      {r.open_reports} åben{r.open_reports > 1 ? "e" : ""}
                    </span>
                  ) : (
                    r.total_reports
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.is_admin && <span className="rounded bg-deep-900 px-1.5 py-0.5 text-xs font-semibold text-white">Admin</span>}
                    {r.is_banned && (
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                        {r.banned_until ? "Bortvist" : "Permanent"}
                      </span>
                    )}
                    {!r.username && <span className="rounded bg-lure-400/30 px-1.5 py-0.5 text-xs text-deep-900">Ikke færdig</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Sider">
          {page > 1 ? (
            <Link href={buildHref(current, { side: String(page - 1) })} className="flex items-center gap-1 font-medium text-deep-800 hover:underline">
              <ChevronLeft className="h-4 w-4" aria-hidden /> Forrige
            </Link>
          ) : (
            <span />
          )}
          <span className="text-deep-700">
            Side {page} af {pages}
          </span>
          {page < pages ? (
            <Link href={buildHref(current, { side: String(page + 1) })} className="flex items-center gap-1 font-medium text-deep-800 hover:underline">
              Næste <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
