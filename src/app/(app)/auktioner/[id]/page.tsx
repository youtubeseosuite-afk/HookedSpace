// src/app/(app)/auktioner/[id]/page.tsx
// OPDATERET (beskeder mellem sælger og vinder). Én auktion på GrejAuktionen: billeder, beskrivelse, pris der opdateres live, budhistorik
// (navne skjult) og sælgeren med Flex og bedømmelser. Kan ses af alle, også gæster.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Truck, ThumbsUp, ThumbsDown, Tag, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { categoryLabel, conditionLabel, getAuction, isEnded, kr, minNextBid } from "@/lib/auctions";
import { regionLabel } from "@/lib/regions";
import { LivePrice } from "@/components/auction-live";
import FlexBadge from "@/components/flex-badge";
import CancelAuctionButton from "./cancel-button";
import BidPanel from "./bid-panel";
import DealChat from "./deal-chat";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const a = await getAuction(id);
  if (!a) return { title: "Auktion" };
  const price = a.current_price ?? a.start_price;
  const description = `${conditionLabel(a.condition)} · ${kr(price)} · ${a.bid_count} bud${a.city ? ` · ${a.city}` : ""}. ${
    a.description?.slice(0, 120) ?? ""
  }`.trim();
  return {
    title: a.title,
    description,
    openGraph: {
      title: `${a.title} – GrejAuktionen`,
      description,
      type: "website",
      siteName: "FiskoMan",
      url: `/auktioner/${a.id}`,
      images: a.images[0] ? [{ url: a.images[0].url, width: a.images[0].width ?? undefined, height: a.images[0].height ?? undefined }] : undefined,
    },
    twitter: { card: a.images[0] ? "summary_large_image" : "summary", title: a.title, description },
  };
}

function dkDateTime(iso: string) {
  return new Date(iso).toLocaleString("da-DK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  });
}

export default async function AuctionPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const [a, { userId }] = await Promise.all([getAuction(id), getCurrentProfile()]);
  if (!a) notFound();

  const supabase = await createClient();
  const [{ data: bids }, { data: ratings }] = await Promise.all([
    supabase.rpc("auction_bids_public", { p_auction: a.id }),
    supabase.from("auction_ratings").select("positive").eq("ratee_id", a.seller_id),
  ]);
  const bidList = (bids ?? []) as { amount: number; created_at: string; bidder: string; is_me: boolean }[];
  const ups = (ratings ?? []).filter((r) => r.positive).length;
  const downs = (ratings ?? []).length - ups;

  const sellerName = a.seller?.display_name ?? a.seller?.username ?? "Ukendt";
  const isSeller = userId === a.seller_id;
  const ended = isEnded(a);
  const buyNowOpen = a.buy_now_price != null && (a.current_price ?? 0) < a.buy_now_price;

  // Solgt: sælger og vinder kan skrive sammen
  const isWinner = !!userId && userId === a.winner_id;
  const inDeal = a.status === "sold" && !!userId && (isSeller || isWinner) && !!a.winner_id;
  let dealOther: { name: string; username: string | null } | null = null;
  if (inDeal) {
    if (isSeller) {
      const { data: w } = await supabase.from("profiles").select("username, display_name").eq("id", a.winner_id!).maybeSingle();
      dealOther = { name: w?.display_name ?? w?.username ?? "Køberen", username: w?.username ?? null };
    } else {
      dealOther = { name: sellerName, username: a.seller?.username ?? null };
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:py-8">
      <Link href="/auktioner" className="inline-flex items-center gap-1 text-sm font-medium text-deep-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> GrejAuktionen
      </Link>

      {inDeal && dealOther && userId && (
        <DealChat
          auctionId={a.id}
          meId={userId}
          role={isSeller ? "seller" : "buyer"}
          other={dealOther}
          price={a.final_price ?? a.current_price ?? 0}
        />
      )}

      {isSeller && a.status === "unsold" && (
        <p className="rounded-2xl bg-white p-4 text-sm text-deep-900 shadow-sm ring-1 ring-mist-100">
          Auktionen sluttede uden bud.{" "}
          <Link href="/auktioner/ny" className="font-semibold underline">
            Opret den igen
          </Link>{" "}
          med en lavere startpris eller flere billeder.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Billeder */}
        <section className="space-y-2 lg:col-span-3">
          {a.images.length === 0 ? (
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-mist-100 text-sm text-deep-700">
              Ingen billeder
            </div>
          ) : (
            <>
              <a href={a.images[0].url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-mist-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.images[0].url} alt={a.title} className="max-h-[520px] w-full object-contain" />
              </a>
              {a.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {a.images.slice(1).map((img) => (
                    <a key={img.url} href={img.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-mist-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" loading="lazy" className="aspect-square w-full object-cover hover:opacity-90" />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Pris, bud og sælger */}
        <section className="space-y-3 lg:col-span-2">
          <div>
            <h1 className="text-2xl font-bold leading-tight text-deep-950">{a.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-deep-900 px-2.5 py-1 font-medium text-lure-400">{conditionLabel(a.condition)}</span>
              <span className="flex items-center gap-1 rounded-full bg-mist-100 px-2.5 py-1 text-deep-800">
                <Tag className="h-3 w-3" aria-hidden /> {categoryLabel(a.category)}
              </span>
              {a.city && (
                <span className="flex items-center gap-1 rounded-full bg-mist-100 px-2.5 py-1 text-deep-800">
                  <MapPin className="h-3 w-3" aria-hidden /> {a.city}
                  {a.region ? `, ${regionLabel(a.region)}` : ""}
                </span>
              )}
              <span className="flex items-center gap-1 rounded-full bg-mist-100 px-2.5 py-1 text-deep-800">
                <Truck className="h-3 w-3" aria-hidden /> {a.can_ship ? "Kan sendes" : "Kun afhentning"}
              </span>
            </div>
          </div>

          <LivePrice
            auction={{
              id: a.id,
              current_price: a.current_price,
              start_price: a.start_price,
              bid_count: a.bid_count,
              ends_at: a.ends_at,
              status: a.status,
              final_price: a.final_price,
              buy_now_price: a.buy_now_price,
            }}
          />

          {!ended && !isSeller && (
            <BidPanel
              auctionId={a.id}
              loggedIn={!!userId}
              minBid={minNextBid(a)}
              minIncrement={a.min_increment}
              buyNowPrice={buyNowOpen ? a.buy_now_price : null}
              isHighBidder={!!userId && userId === a.high_bidder_id}
            />
          )}

          <p className="flex items-center gap-1.5 text-xs text-deep-700">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Slutter {dkDateTime(a.ends_at)} · Mindste overbud {kr(a.min_increment)}
          </p>

          {isSeller && (
            <div className="space-y-2 rounded-lg bg-lure-400/20 px-3 py-2 text-sm text-deep-900">
              <p>Det er din auktion.</p>
              {a.status === "active" && a.bid_count === 0 && <CancelAuctionButton auctionId={a.id} />}
            </div>
          )}

          {/* Sælger */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-deep-700">Sælger</p>
            <div className="flex items-center gap-3">
              {a.seller?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.seller.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-reed-500 font-semibold text-white">
                  {sellerName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                {a.seller ? (
                  <Link href={`/u/${a.seller.username}`} className="font-semibold text-deep-950 hover:underline">
                    {sellerName}
                  </Link>
                ) : (
                  <span className="font-semibold text-deep-950">{sellerName}</span>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-deep-700">
                  {a.seller && <FlexBadge points={a.seller.flex ?? 0} size="xs" showLabel />}
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5 text-reed-500" aria-hidden /> {ups}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown className="h-3.5 w-3.5 text-red-600" aria-hidden /> {downs}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Beskrivelse */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100 lg:col-span-3">
          <h2 className="mb-2 font-semibold text-deep-900">Beskrivelse</h2>
          {a.description ? (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-deep-900">{a.description}</p>
          ) : (
            <p className="text-sm text-deep-700">Sælgeren har ikke skrevet en beskrivelse.</p>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-mist-100 pt-3 text-sm">
            <dt className="text-deep-700">Startpris</dt>
            <dd className="text-right font-medium text-deep-950">{kr(a.start_price)}</dd>
            {a.buy_now_price != null && (
              <>
                <dt className="text-deep-700">Køb nu</dt>
                <dd className="text-right font-medium text-deep-950">{kr(a.buy_now_price)}</dd>
              </>
            )}
            <dt className="text-deep-700">Oprettet</dt>
            <dd className="text-right text-deep-950">{dkDateTime(a.created_at)}</dd>
          </dl>
        </section>

        {/* Budhistorik */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100 lg:col-span-2">
          <h2 className="mb-2 font-semibold text-deep-900">Bud ({bidList.length})</h2>
          {bidList.length === 0 ? (
            <p className="text-sm text-deep-700">Ingen bud endnu. Bliv den første.</p>
          ) : (
            <ol className="max-h-80 divide-y divide-mist-100 overflow-y-auto">
              {bidList.map((b, i) => (
                <li key={`${b.created_at}-${i}`} className={`flex items-center justify-between gap-2 py-2 text-sm ${b.is_me ? "font-semibold" : ""}`}>
                  <span className="text-deep-900">
                    {b.is_me ? "Dig" : b.bidder}
                    {i === 0 && <span className="ml-2 rounded bg-reed-300/40 px-1.5 py-0.5 text-xs text-deep-900">Højest</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-deep-700">{dkDateTime(b.created_at)}</span>
                    <span className="tabular-nums text-deep-950">{kr(b.amount)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <p className="text-center text-xs text-deep-700">
        FiskoMan er ikke part i handlen. Køber og sælger aftaler selv betaling og afhentning.{" "}
        <Link href="/regler" className="underline">
          Læs reglerne
        </Link>
      </p>
    </main>
  );
}
