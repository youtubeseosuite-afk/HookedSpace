// src/components/auction-card.tsx
// NY FIL. Kort med én auktion i oversigten: billede, titel, pris, antal bud og nedtælling.

import Link from "next/link";
import { Gavel, MapPin, Truck, ImageOff } from "lucide-react";
import { conditionLabel, type AuctionListItem } from "@/lib/auctions";
import { Countdown } from "@/components/auction-live";

export default function AuctionCard({ a }: { a: AuctionListItem }) {
  const ended = a.status !== "active" || new Date(a.ends_at).getTime() <= Date.now();
  const price = a.status === "sold" ? a.final_price : a.current_price ?? a.start_price;

  return (
    <Link
      href={`/auktioner/${a.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100 transition hover:ring-deep-700/40"
    >
      <div className="relative aspect-[4/3] bg-mist-100">
        {a.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.image} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-deep-700/40">
            <ImageOff className="h-8 w-8" aria-hidden />
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-deep-900">
          {conditionLabel(a.condition)}
        </span>
        {ended && (
          <span className="absolute inset-x-0 bottom-0 bg-deep-950/75 py-1 text-center text-xs font-semibold text-mist-50">
            {a.status === "sold" ? "Solgt" : a.status === "unsold" ? "Ingen bud" : "Slut"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-deep-950">{a.title}</h3>
        <p className="text-lg font-bold tabular-nums text-deep-950">
          {(price ?? 0).toLocaleString("da-DK")} kr.
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-deep-700">
          <span className="flex items-center gap-1">
            <Gavel className="h-3.5 w-3.5" aria-hidden /> {a.bid_count} bud
          </span>
          {!ended && <Countdown endsAt={a.ends_at} />}
        </div>
        {(a.city || a.can_ship) && (
          <p className="flex items-center gap-2 truncate text-xs text-deep-700">
            {a.city && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {a.city}
              </span>
            )}
            {a.can_ship && (
              <span className="flex items-center gap-0.5">
                <Truck className="h-3 w-3" aria-hidden /> Sendes
              </span>
            )}
          </p>
        )}
      </div>
    </Link>
  );
}
