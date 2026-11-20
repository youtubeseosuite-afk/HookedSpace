// src/app/(app)/notifikationer/page.tsx
// OPDATERET (notifikationer fra GrejAuktionen). Liste over notifikationer (reaktioner, kommentarer, tags, delinger, nye følgere, badges og auktioner).
// Ulæste markeres med en prik og bliver markeret som læst, når siden åbnes.

import type { Metadata } from "next";
import Link from "next/link";
import { Bell, MessageCircle, UserPlus, Tag, Repeat2, Users, Gavel } from "lucide-react";
import { requireProfile, type CurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import BadgeIcon, { hasBadgeImage } from "@/components/badge-icon";
import { FlexIcon } from "@/components/flex-badge";
import { levelByNumber } from "@/lib/flex";

export const metadata: Metadata = {
  title: "Notifikationer",
};

type NotificationType =
  | "reaction"
  | "comment"
  | "tag"
  | "follow"
  | "share"
  | "badge"
  | "challenge"
  | "group_request"
  | "group_approved"
  | "flex_level"
  | "auction_outbid"
  | "auction_won"
  | "auction_sold"
  | "auction_unsold"
  | "auction_message"
  | "auction_rating";

type AuctionType = Extract<NotificationType, `auction_${string}`>;

type Row = {
  id: string;
  type: NotificationType;
  post_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: { username: string; display_name: string | null; avatar_url: string | null } | null;
  post: { body: string | null } | null;
  comment: { body: string } | null;
  badge_id: string | null;
  flex_level: number | null;
  badge: { name: string; emoji: string; description: string } | null;
  challenge: { title: string; emoji: string; description: string } | null;
  group: { slug: string; name: string } | null;
  auction: { id: string; title: string; final_price: number | null; current_price: number | null } | null;
};

const TEXT: Record<Exclude<NotificationType, "badge" | "challenge" | "group_request" | "group_approved" | "flex_level" | AuctionType>, string> = {
  reaction: "gav dit opslag et Knæk og bræk",
  comment: "kommenterede dit opslag",
  tag: "taggede dig i et opslag",
  follow: "begyndte at følge dig",
  share: "delte dit opslag",
};

function hrefFor(n: Row, me: CurrentProfile) {
  if (n.type === "badge") return `/u/${me.username}`;
  if (n.type === "flex_level") return "/flex";
  if (n.type.startsWith("auction_")) {
    if (!n.auction) return "/auktioner";
    return n.type === "auction_message" || n.type === "auction_won" || n.type === "auction_sold"
      ? `/auktioner/${n.auction.id}#handel`
      : `/auktioner/${n.auction.id}`;
  }
  if (n.type === "challenge") return "/feed";
  if (n.type === "group_request") return n.group ? `/g/${n.group.slug}/admin` : "/grupper";
  if (n.type === "group_approved") return n.group ? `/g/${n.group.slug}` : "/grupper";
  if (n.type === "follow") return n.actor ? `/u/${n.actor.username}` : "#";
  return n.post_id ? `/p/${n.post_id}` : "#";
}

function TypeIcon({ type }: { type: NotificationType }) {
  const base = "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white";
  switch (type) {
    case "reaction":
      return <span className={`${base} bg-lure-400 text-[11px]`}>🎣</span>;
    case "comment":
      return (
        <span className={`${base} bg-deep-700 text-white`}>
          <MessageCircle className="h-3 w-3" />
        </span>
      );
    case "tag":
      return (
        <span className={`${base} bg-reed-500 text-white`}>
          <Tag className="h-3 w-3" />
        </span>
      );
    case "share":
      return (
        <span className={`${base} bg-deep-900 text-lure-400`}>
          <Repeat2 className="h-3 w-3" />
        </span>
      );
    case "follow":
      return (
        <span className={`${base} bg-deep-900 text-white`}>
          <UserPlus className="h-3 w-3" />
        </span>
      );
    case "group_request":
    case "group_approved":
      return (
        <span className={`${base} bg-deep-900 text-lure-400`}>
          <Users className="h-3 w-3" />
        </span>
      );
    case "badge":
    case "challenge":
    case "flex_level":
    case "auction_outbid":
    case "auction_won":
    case "auction_sold":
    case "auction_unsold":
    case "auction_message":
    case "auction_rating":
      return null;
  }
}

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "lige nu";
  if (s < 3600) return `${Math.floor(s / 60)} min. siden`;
  if (s < 86400) return `${Math.floor(s / 3600)} t. siden`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d. siden`;
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", timeZone: "Europe/Copenhagen" });
}

function snippet(text: string | null | undefined, max = 80) {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export default async function NotifikationerPage() {
  const me = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select(
      `id, type, post_id, badge_id, flex_level, read_at, created_at,
       actor:profiles!notifications_actor_id_fkey ( username, display_name, avatar_url ),
       post:posts!notifications_post_id_fkey ( body ),
       comment:post_comments!notifications_comment_id_fkey ( body ),
       badge:badges!notifications_badge_id_fkey ( name, emoji, description ),
       challenge:challenges!notifications_challenge_id_fkey ( title, emoji, description ),
       group:groups!notifications_group_id_fkey ( slug, name ),
       auction:auctions!notifications_auction_id_fkey ( id, title, final_price, current_price )`
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as Row[];

  // Marker alle som læst (efter vi har hentet dem, så de nye stadig vises som nye denne gang)
  if (rows.some((r) => !r.read_at)) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-deep-900">Notifikationer</h1>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-mist-100">
          <Bell className="mx-auto h-10 w-10 text-reed-500" aria-hidden />
          <p className="mt-3 font-semibold text-deep-900">Ingen notifikationer endnu</p>
          <p className="mt-1 text-sm text-deep-700">
            Her kan du se, når nogen reagerer på, kommenterer eller deler dine opslag.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-mist-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
          {rows.map((n) => {
            const name = n.actor?.display_name ?? n.actor?.username ?? "Nogen";
            const href = hrefFor(n, me);
            const extra =
              n.type === "group_request" || n.type === "group_approved"
                ? null
                : n.type === "badge"
                ? n.badge?.description
                : n.type === "challenge"
                  ? n.challenge?.description
                : n.type === "comment"
                  ? snippet(n.comment?.body)
                  : snippet(n.post?.body);
            const unread = !n.read_at;

            if (n.type === "flex_level") {
              const lvl = levelByNumber(n.flex_level);
              return (
                <li key={n.id}>
                  <Link
                    href={href}
                    className={`flex items-start gap-3 p-4 transition hover:bg-mist-50 ${unread ? "bg-lure-400/10" : ""}`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-deep-900 text-lure-400">
                      <FlexIcon className="h-7 w-7" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-deep-900">
                        Stangen bøjer! Du har nået Flex-niveau {lvl.level}:{" "}
                        <span className="font-semibold text-deep-950">{lvl.name}</span>
                      </span>
                      <span className={`mt-0.5 block text-xs ${unread ? "font-semibold text-lure-500" : "text-deep-700"}`}>
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                    {unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-lure-400" aria-label="Ulæst" />}
                  </Link>
                </li>
              );
            }

            if (n.type.startsWith("auction_")) {
              const title = n.auction?.title ?? "en auktion";
              const price = (n.auction?.final_price ?? n.auction?.current_price ?? 0).toLocaleString("da-DK");
              const good = n.type === "auction_won" || n.type === "auction_sold";
              const text =
                n.type === "auction_outbid" ? (
                  <>Du er blevet overbudt på <b className="text-deep-950">{title}</b>. Byd igen, før auktionen slutter.</>
                ) : n.type === "auction_won" ? (
                  <>Du vandt <b className="text-deep-950">{title}</b> for {price} kr. Skriv til sælgeren og aftal betaling og afhentning.</>
                ) : n.type === "auction_sold" ? (
                  <><b className="text-deep-950">{title}</b> er solgt for {price} kr. Skriv til køberen og aftal betaling og afhentning.</>
                ) : n.type === "auction_unsold" ? (
                  <><b className="text-deep-950">{title}</b> sluttede uden bud.</>
                ) : n.type === "auction_message" ? (
                  <><b className="text-deep-950">{name}</b> har skrevet til dig om <b className="text-deep-950">{title}</b>.</>
                ) : (
                  <><b className="text-deep-950">{name}</b> har bedømt jeres handel om <b className="text-deep-950">{title}</b>.</>
                );
              return (
                <li key={n.id}>
                  <Link
                    href={href}
                    className={`flex items-start gap-3 p-4 transition hover:bg-mist-50 ${unread ? "bg-lure-400/10" : ""}`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        good ? "bg-lure-400 text-deep-950" : "bg-deep-900 text-lure-400"
                      }`}
                    >
                      {n.type === "auction_message" ? <MessageCircle className="h-5 w-5" aria-hidden /> : <Gavel className="h-5 w-5" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-deep-900">{text}</span>
                      <span className={`mt-0.5 block text-xs ${unread ? "font-semibold text-lure-500" : "text-deep-700"}`}>
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                    {unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-lure-400" aria-label="Ulæst" />}
                  </Link>
                </li>
              );
            }

            if (n.type === "badge" || n.type === "challenge") {
              const isChallenge = n.type === "challenge";
              return (
                <li key={n.id}>
                  <Link
                    href={href}
                    className={`flex items-start gap-3 p-4 transition hover:bg-mist-50 ${unread ? "bg-lure-400/10" : ""}`}
                  >
                    {!isChallenge && n.badge_id && hasBadgeImage(n.badge_id) ? (
                      <BadgeIcon id={n.badge_id} size={44} />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-deep-900 text-2xl">
                        {(isChallenge ? n.challenge?.emoji : n.badge?.emoji) ?? "🏅"}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-deep-900">
                        {isChallenge ? "Udfordring gennemført: " : "Nyt badge: "}
                        <span className="font-semibold text-deep-950">
                          {(isChallenge ? n.challenge?.title : n.badge?.name) ?? "Ukendt"}
                        </span>
                      </span>
                      {extra && <span className="mt-0.5 block truncate text-sm text-deep-700">{extra}</span>}
                      <span className={`mt-0.5 block text-xs ${unread ? "font-semibold text-lure-500" : "text-deep-700"}`}>
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                    {unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-lure-400" aria-label="Ulæst" />}
                  </Link>
                </li>
              );
            }

            return (
              <li key={n.id}>
                <Link
                  href={href}
                  className={`flex items-start gap-3 p-4 transition hover:bg-mist-50 ${unread ? "bg-lure-400/10" : ""}`}
                >
                  <span className="relative shrink-0">
                    {n.actor?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.actor.avatar_url}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-reed-500 font-semibold text-white">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <TypeIcon type={n.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-deep-900">
                      <span className="font-semibold text-deep-950">{name}</span>{" "}
                      {n.type === "group_request" ? (
                        <>
                          vil gerne være med i <span className="font-semibold text-deep-950">{n.group?.name ?? "din gruppe"}</span>
                        </>
                      ) : n.type === "group_approved" ? (
                        <>
                          godkendte dig. Du er nu medlem af{" "}
                          <span className="font-semibold text-deep-950">{n.group?.name ?? "gruppen"}</span>
                        </>
                      ) : (
                        TEXT[n.type as keyof typeof TEXT]
                      )}
                    </span>
                    {extra && <span className="mt-0.5 block truncate text-sm text-deep-700">&quot;{extra}&quot;</span>}
                    <span className={`mt-0.5 block text-xs ${unread ? "font-semibold text-lure-500" : "text-deep-700"}`}>
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                  {unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-lure-400" aria-label="Ulæst" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
