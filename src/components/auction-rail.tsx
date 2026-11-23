// src/components/auction-rail.tsx
// NY FIL. Indholdet i højre sidebar: de 5 nyeste aktive auktioner fra GrejAuktionen med billede, titel, pris,
// nedtælling og en knap. Nederst "Sælg dit grej" og "Se alle auktioner".

import Link from "next/link";
import { Gavel, ImageOff, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { auctionImageUrl } from "@/lib/auctions";
import { Countdown } from "@/components/auction-live";

type Row = {
  id: string;
  title: string;
  start_price: number;
  current_price: number | null;
  bid_count: number;
  ends_at: string;
  auction_images: { storage_path: string; position: number }[] | null;
};

export default async function AuctionRail({ loggedIn }: { loggedIn: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("auctions")
    .select("id, title, start_price, current_price, bid_count, ends_at, auction_images ( storage_path, position )")
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(5);
  const auctions = (data ?? []) as Row[];

  return (
    <div className="flex min-h-full flex-col p-4">
      <h2 className="flex items-center gap-2 font-bold text-deep-950">
        <Gavel className="h-5 w-5 text-lure-500" aria-hidden /> GrejAuktionen
      </h2>
      <p className="mb-3 text-xs text-deep-700">Nyeste auktioner på brugt fiskegrej</p>

      {auctions.length === 0 ? (
        <p className="rounded-xl bg-mist-50 p-3 text-sm text-deep-700">Ingen auktioner lige nu. Bliv den første til at sælge dit grej.</p>
      ) : (
        <ul className="space-y-3">
          {auctions.map((a) => {
            const first = [...(a.auction_images ?? [])].sort((x, y) => x.position - y.position)[0];
            const price = a.current_price ?? a.start_price;
            return (
              <li key={a.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-mist-100">
                <Link href={`/auktioner/${a.id}`} className="group block">
                  <div className="aspect-[4/3] bg-mist-100">
                    {first ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={auctionImageUrl(first.storage_path)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:opacity-90"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-deep-700/40">
                        <ImageOff className="h-6 w-6" aria-hidden />
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 p-2.5">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-deep-950 group-hover:underline">{a.title}</h3>
                    <div className="flex items-center justify-between gap-2 text-xs text-deep-700">
                      <span className="text-sm font-bold text-deep-950 tabular-nums">{price.toLocaleString("da-DK")} kr.</span>
                      <Countdown endsAt={a.ends_at} />
                    </div>
                    <span className="mt-1 block rounded-lg bg-deep-900 py-1.5 text-center text-xs font-bold text-mist-50 group-hover:bg-deep-800">
                      {a.bid_count === 0 ? "Byd først" : "Se og byd"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 space-y-2">
        <Link
          href={loggedIn ? "/auktioner/ny" : "/login?opret=1&next=/auktioner/ny"}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-lure-400 py-2 text-sm font-bold text-deep-950 hover:bg-lure-500"
        >
          <Plus className="h-4 w-4" aria-hidden /> Sælg dit grej
        </Link>
        <Link href="/auktioner" className="block text-center text-sm font-medium text-deep-700 hover:underline">
          Se alle auktioner
        </Link>
      </div>
    </div>
  );
}
