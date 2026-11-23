// src/app/admin/auktioner/page.tsx
// NY FIL. Admin: alle auktioner på GrejAuktionen. Filtrér på status, søg på titel, se sælger, pris og bud, og slet.

import type { Metadata } from "next";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, ExternalLink, ImageOff } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { auctionImageUrl, categoryLabel } from "@/lib/auctions";
import { dkDateTime } from "../format";
import DeleteAuctionButton from "./delete-button";

export const metadata: Metadata = { title: "Auktioner" };

const PAGE_SIZE = 40;

const STATUSES = [
  { key: "aktive", label: "Aktive" },
  { key: "solgte", label: "Solgte" },
  { key: "uden-bud", label: "Uden bud" },
  { key: "alle", label: "Alle" },
] as const;

type Row = {
  id: string;
  title: string;
  category: string;
  status: "active" | "sold" | "unsold";
  start_price: number;
  current_price: number | null;
  final_price: number | null;
  bid_count: number;
  ends_at: string;
  created_at: string;
  seller_id: string;
  winner_id: string | null;
  seller: { username: string | null; display_name: string | null } | null;
  auction_images: { storage_path: string; position: number }[] | null;
};

type SP = { status?: string; q?: string; side?: string };

export default async function AdminAuctionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s.key === sp.status)?.key ?? "aktive";
  const q = (sp.q ?? "").replace(/[%_,()*\\]/g, " ").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(sp.side ?? "1", 10) || 1);

  const db = createAdminClient();
  let query = db
    .from("auctions")
    .select(
      "id, title, category, status, start_price, current_price, final_price, bid_count, ends_at, created_at, seller_id, winner_id, seller:profiles!auctions_seller_id_fkey ( username, display_name ), auction_images ( storage_path, position )",
      { count: "exact" }
    );
  if (status === "aktive") query = query.eq("status", "active");
  if (status === "solgte") query = query.eq("status", "sold");
  if (status === "uden-bud") query = query.eq("status", "unsold");
  if (q) query = query.ilike("title", `%${q}%`);
  query = status === "aktive" ? query.order("ends_at", { ascending: true }) : query.order("created_at", { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const [{ data, count, error }, activeCount, soldCount, openReports] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    db.from("auctions").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("auctions").select("final_price").eq("status", "sold").limit(10000),
    db.from("reports").select("target_id").eq("target_type", "auction").eq("status", "open"),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const soldRows = (soldCount.data ?? []) as { final_price: number | null }[];
  const soldTotal = soldRows.reduce((sum, r) => sum + (r.final_price ?? 0), 0);
  const reported = new Map<string, number>();
  for (const r of (openReports.data ?? []) as { target_id: string }[]) reported.set(r.target_id, (reported.get(r.target_id) ?? 0) + 1);

  const href = (patch: Partial<SP>) => {
    const m = { status, q, side: String(page), ...patch };
    const p = new URLSearchParams();
    if (m.status && m.status !== "aktive") p.set("status", m.status);
    if (m.q) p.set("q", m.q);
    if (m.side && m.side !== "1") p.set("side", m.side);
    const s = p.toString();
    return `/admin/auktioner${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-deep-900">
          Auktioner <span className="text-base font-normal text-deep-700">({count ?? 0})</span>
        </h1>
        <form action="/admin/auktioner" className="flex w-full max-w-md gap-2 sm:w-auto">
          {status !== "aktive" && <input type="hidden" name="status" value={status} />}
          <label className="relative flex-1">
            <span className="sr-only">Søg</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-700" aria-hidden />
            <input
              name="q"
              defaultValue={q}
              placeholder="Søg på titel"
              className="w-full rounded-lg border border-mist-100 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-deep-700"
            />
          </label>
          <button className="rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-white hover:bg-deep-800">Søg</button>
        </form>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
          <p className="text-sm text-deep-700">Aktive</p>
          <p className="text-2xl font-bold text-deep-950">{activeCount.count ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
          <p className="text-sm text-deep-700">Solgt</p>
          <p className="text-2xl font-bold text-deep-950">{soldRows.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
          <p className="text-sm text-deep-700">Handlet for</p>
          <p className="text-2xl font-bold text-deep-950">{soldTotal.toLocaleString("da-DK")} kr.</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s.key}
            href={href({ status: s.key, side: "1" })}
            className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${
              status === s.key ? "bg-deep-900 text-white ring-deep-900" : "bg-white text-deep-800 ring-mist-100 hover:ring-deep-700"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Kunne ikke hente auktioner ({error.message})</p>}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-mist-100 bg-mist-50 text-xs uppercase tracking-wide text-deep-700">
            <tr>
              <th className="px-3 py-2 font-semibold">Auktion</th>
              <th className="px-3 py-2 font-semibold">Sælger</th>
              <th className="px-3 py-2 text-right font-semibold">Pris</th>
              <th className="px-3 py-2 text-right font-semibold">Bud</th>
              <th className="px-3 py-2 font-semibold">Slutter / sluttede</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-deep-700">
                  Ingen auktioner her.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const first = [...(r.auction_images ?? [])].sort((a, b) => a.position - b.position)[0];
              const price = r.status === "sold" ? r.final_price : r.current_price ?? r.start_price;
              const reports = reported.get(r.id) ?? 0;
              return (
                <tr key={r.id} className={`hover:bg-mist-50 ${reports ? "bg-red-50/50" : ""}`}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {first ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={auctionImageUrl(first.storage_path)} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-mist-100 text-deep-700/50">
                          <ImageOff className="h-4 w-4" aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0">
                        <Link href={`/auktioner/${r.id}`} className="flex items-center gap-1 font-semibold text-deep-950 hover:underline">
                          <span className="truncate">{r.title}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                        </Link>
                        <span className="block text-xs text-deep-700">
                          {categoryLabel(r.category)}
                          {reports > 0 && (
                            <span className="ml-1 font-semibold text-red-700">
                              · {reports} åben{reports > 1 ? "e" : ""} rapport{reports > 1 ? "er" : ""}
                            </span>
                          )}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/medlemmer/${r.seller_id}`} className="text-deep-950 hover:underline">
                      {r.seller?.display_name ?? r.seller?.username ?? "Slettet"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{(price ?? 0).toLocaleString("da-DK")} kr.</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.bid_count}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-deep-800">{dkDateTime(r.ends_at)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        r.status === "active" ? "bg-reed-300/50 text-deep-950" : r.status === "sold" ? "bg-deep-900 text-white" : "bg-mist-100 text-deep-800"
                      }`}
                    >
                      {r.status === "active" ? "Aktiv" : r.status === "sold" ? "Solgt" : "Uden bud"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DeleteAuctionButton auctionId={r.id} title={r.title} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Sider">
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
    </div>
  );
}
