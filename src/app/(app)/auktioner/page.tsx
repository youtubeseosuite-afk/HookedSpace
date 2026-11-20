// src/app/(app)/auktioner/page.tsx
// NY FIL. GrejAuktionen: oversigt over auktioner på brugt fiskegrej. Kan ses af alle, også gæster.
// Filtre: søg, kategori, landsdel, sortering (slutter snart / nyeste) og afsluttede auktioner.

import type { Metadata } from "next";
import Link from "next/link";
import { Gavel, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { AUCTION_CATEGORIES, AUCTIONS_PAGE_SIZE, getAuctions } from "@/lib/auctions";
import { REGIONS } from "@/lib/regions";
import AuctionCard from "@/components/auction-card";

export const metadata: Metadata = {
  title: "GrejAuktionen",
  description: "Køb og sælg brugt fiskegrej på auktion. Stænger, hjul, waders, ekkolod og meget mere fra danske lystfiskere.",
};

type SP = { q?: string; kategori?: string; omraade?: string; sortering?: string; afsluttede?: string; side?: string };

export default async function AuctionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { userId } = await getCurrentProfile();

  const q = (sp.q ?? "").trim().slice(0, 80);
  const category = AUCTION_CATEGORIES.some((c) => c.key === sp.kategori) ? sp.kategori : undefined;
  const region = REGIONS.some((r) => r.key === sp.omraade) ? sp.omraade : undefined;
  const sort = sp.sortering === "nyeste" ? "nyeste" : "slutter";
  const ended = sp.afsluttede === "1";
  const page = Math.max(1, Number.parseInt(sp.side ?? "1", 10) || 1);

  const { auctions, total } = await getAuctions({ q: q || undefined, category, region, sort, ended, page });
  const pages = Math.max(1, Math.ceil(total / AUCTIONS_PAGE_SIZE));

  const href = (patch: Partial<SP>) => {
    const m: SP = { q, kategori: category, omraade: region, sortering: sort, afsluttede: ended ? "1" : undefined, side: String(page), ...patch };
    const p = new URLSearchParams();
    if (m.q) p.set("q", m.q);
    if (m.kategori) p.set("kategori", m.kategori);
    if (m.omraade) p.set("omraade", m.omraade);
    if (m.sortering && m.sortering !== "slutter") p.set("sortering", m.sortering);
    if (m.afsluttede === "1") p.set("afsluttede", "1");
    if (m.side && m.side !== "1") p.set("side", m.side);
    const s = p.toString();
    return `/auktioner${s ? `?${s}` : ""}`;
  };

  const pill = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1 text-sm font-medium ring-1 ${
      active ? "bg-deep-900 text-white ring-deep-900" : "bg-white text-deep-800 ring-mist-100 hover:ring-deep-700"
    }`;

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-deep-900">
            <Gavel className="h-6 w-6 text-lure-500" aria-hidden /> GrejAuktionen
          </h1>
          <p className="text-sm text-deep-700">Brugt fiskegrej fra danske lystfiskere. Byd, vind og aftal resten med sælgeren.</p>
        </div>
        <Link
          href={userId ? "/auktioner/ny" : "/login?opret=1&next=/auktioner/ny"}
          className="flex items-center gap-2 rounded-lg bg-lure-400 px-4 py-2.5 text-sm font-bold text-deep-950 hover:bg-lure-500"
        >
          <Plus className="h-4 w-4" aria-hidden /> Sælg dit grej
        </Link>
      </div>

      {/* Søg og landsdel */}
      <form action="/auktioner" className="flex flex-wrap gap-2">
        {category && <input type="hidden" name="kategori" value={category} />}
        {sort !== "slutter" && <input type="hidden" name="sortering" value={sort} />}
        {ended && <input type="hidden" name="afsluttede" value="1" />}
        <label className="relative min-w-0 basis-full sm:basis-auto sm:flex-1">
          <span className="sr-only">Søg</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-700" aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Søg fx Shimano, waders, ekkolod"
            className="w-full rounded-lg border border-mist-100 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-deep-700"
          />
        </label>
        <select
          name="omraade"
          defaultValue={region ?? ""}
          aria-label="Landsdel"
          className="min-w-0 flex-1 rounded-lg border sm:flex-none border-mist-100 bg-white px-3 py-2 text-sm text-deep-900 outline-none focus:border-deep-700"
        >
          <option value="">Hele landet</option>
          {REGIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-white hover:bg-deep-800">Søg</button>
      </form>

      {/* Kategorier */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={href({ kategori: undefined, side: "1" })} className={pill(!category)}>
          Alt
        </Link>
        {AUCTION_CATEGORIES.map((c) => (
          <Link key={c.key} href={href({ kategori: c.key, side: "1" })} className={pill(category === c.key)}>
            {c.label}
          </Link>
        ))}
      </div>

      {/* Sortering */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {!ended && (
            <>
              <span className="text-deep-700">Sortér:</span>
              <Link href={href({ sortering: "slutter", side: "1" })} className={sort === "slutter" ? "font-semibold text-deep-950 underline" : "text-deep-700 hover:underline"}>
                Slutter snart
              </Link>
              <Link href={href({ sortering: "nyeste", side: "1" })} className={sort === "nyeste" ? "font-semibold text-deep-950 underline" : "text-deep-700 hover:underline"}>
                Nyeste
              </Link>
            </>
          )}
        </div>
        <Link href={href({ afsluttede: ended ? undefined : "1", side: "1" })} className="font-medium text-deep-700 hover:underline">
          {ended ? "Se aktive auktioner" : "Se afsluttede auktioner"}
        </Link>
      </div>

      <p className="text-sm text-deep-700">
        {total} {ended ? "afsluttede" : "aktive"} {total === 1 ? "auktion" : "auktioner"}
      </p>

      {auctions.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-mist-100">
          <Gavel className="mx-auto h-10 w-10 text-reed-500" aria-hidden />
          <p className="mt-3 font-semibold text-deep-900">{q || category || region ? "Ingen auktioner matcher" : "Der er ingen auktioner endnu"}</p>
          <p className="mt-1 text-sm text-deep-700">Har du grej, du ikke bruger længere? Sæt det på auktion.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {auctions.map((a) => (
            <AuctionCard key={a.id} a={a} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between pt-2 text-sm" aria-label="Sider">
          {page > 1 ? (
            <Link href={href({ side: String(page - 1) })} className="flex items-center gap-1 font-medium text-deep-800 hover:underline">
              <ChevronLeft className="h-4 w-4" aria-hidden /> Forrige
            </Link>
          ) : (
            <span />
          )}
          <span className="text-deep-700">
            Side {page} af {pages}
          </span>
          {page < pages ? (
            <Link href={href({ side: String(page + 1) })} className="flex items-center gap-1 font-medium text-deep-800 hover:underline">
              Næste <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <p className="pt-2 text-center text-xs text-deep-700">
        FiskoMan er ikke part i handlen. Køber og sælger aftaler selv betaling og afhentning.{" "}
        <Link href="/regler" className="underline">
          Læs reglerne
        </Link>
      </p>
    </main>
  );
}
