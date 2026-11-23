// src/components/profile-auctions.tsx
// NY FIL. Fanen "Auktioner" på profilen: brugerens bedømmelser som køber/sælger, aktive auktioner og afsluttede auktioner.

import Link from "next/link";
import { ThumbsUp, ThumbsDown, Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuctions } from "@/lib/auctions";
import AuctionCard from "@/components/auction-card";

type Rating = {
  positive: boolean;
  comment: string | null;
  created_at: string;
  rater: { username: string; display_name: string | null } | null;
  auction: { id: string; title: string; seller_id: string } | null;
};

export default async function ProfileAuctions({ userId, name, isMe }: { userId: string; name: string; isMe: boolean }) {
  const supabase = await createClient();
  const [active, ended, { data: ratingData }] = await Promise.all([
    getAuctions({ sellerId: userId }),
    getAuctions({ sellerId: userId, ended: true }),
    supabase
      .from("auction_ratings")
      .select(
        "positive, comment, created_at, rater:profiles!auction_ratings_rater_id_fkey ( username, display_name ), auction:auctions ( id, title, seller_id )"
      )
      .eq("ratee_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const ratings = (ratingData ?? []) as unknown as Rating[];
  const ups = ratings.filter((r) => r.positive).length;
  const downs = ratings.length - ups;

  return (
    <div className="space-y-4">
      {/* Bedømmelser */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-deep-900">Bedømmelser fra handler</h2>
          <span className="flex items-center gap-3 text-sm font-semibold">
            <span className="flex items-center gap-1 text-reed-500">
              <ThumbsUp className="h-4 w-4" aria-hidden /> {ups}
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <ThumbsDown className="h-4 w-4" aria-hidden /> {downs}
            </span>
          </span>
        </div>
        {ratings.length === 0 ? (
          <p className="text-sm text-deep-700">{isMe ? "Du har ingen bedømmelser endnu." : `${name} har ingen bedømmelser endnu.`}</p>
        ) : (
          <ul className="divide-y divide-mist-100">
            {ratings.map((r, i) => {
              const raterName = r.rater?.display_name ?? r.rater?.username ?? "Slettet bruger";
              const asSeller = r.auction?.seller_id === userId;
              return (
                <li key={`${r.created_at}-${i}`} className="flex gap-3 py-2.5 text-sm">
                  {r.positive ? (
                    <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-reed-500" aria-label="Positiv" />
                  ) : (
                    <ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="Negativ" />
                  )}
                  <div className="min-w-0">
                    {r.comment && <p className="text-deep-950">“{r.comment}”</p>}
                    <p className="text-xs text-deep-700">
                      {raterName} · som {asSeller ? "køber" : "sælger"}
                      {r.auction && (
                        <>
                          {" "}
                          ·{" "}
                          <Link href={`/auktioner/${r.auction.id}`} className="hover:underline">
                            {r.auction.title}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Aktive auktioner */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-deep-900">Aktive auktioner ({active.total})</h2>
          {isMe && (
            <Link href="/auktioner/ny" className="text-sm font-semibold text-deep-700 hover:underline">
              Sælg dit grej
            </Link>
          )}
        </div>
        {active.auctions.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-mist-100">
            <Gavel className="mx-auto h-8 w-8 text-reed-500" aria-hidden />
            <p className="mt-2 text-sm text-deep-700">{isMe ? "Du har ingen aktive auktioner." : `${name} har ingen aktive auktioner.`}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {active.auctions.map((a) => (
              <AuctionCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      {/* Afsluttede */}
      {ended.auctions.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-deep-900">Afsluttede auktioner ({ended.total})</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ended.auctions.map((a) => (
              <AuctionCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
