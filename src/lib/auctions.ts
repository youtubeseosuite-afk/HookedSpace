// src/lib/auctions.ts
// OPDATERET (kategorier og stand flyttet til auction-options.ts). GrejAuktionen: typer, billed-URL'er og hentning af auktioner.
// Row Level Security i databasen bestemmer, hvad man må se (alle kan se auktioner, også gæster).

import { createClient } from "@/lib/supabase/server";

export {
  AUCTION_CATEGORIES,
  AUCTION_CONDITIONS,
  AUCTION_DURATIONS,
  categoryLabel,
  conditionLabel,
} from "@/lib/auction-options";

export function auctionImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auction-images/${path}`;
}

// 1250 → "1.250 kr."
export function kr(n: number | null | undefined) {
  return `${(n ?? 0).toLocaleString("da-DK")} kr.`;
}

export type AuctionStatus = "active" | "sold" | "unsold";

export type AuctionListItem = {
  id: string;
  title: string;
  category: string;
  condition: string;
  start_price: number;
  current_price: number | null;
  buy_now_price: number | null;
  bid_count: number;
  ends_at: string;
  status: AuctionStatus;
  final_price: number | null;
  city: string | null;
  can_ship: boolean;
  image: string | null;
  seller: { username: string; display_name: string | null } | null;
};

const LIST_SELECT = `
  id, title, category, condition, start_price, current_price, buy_now_price, bid_count, ends_at, status, final_price,
  city, can_ship,
  auction_images ( storage_path, position ),
  seller:profiles!auctions_seller_id_fkey ( username, display_name )
`;

type RawListRow = Omit<AuctionListItem, "image" | "seller"> & {
  auction_images: { storage_path: string; position: number }[] | null;
  seller: { username: string; display_name: string | null } | null;
};

function mapListRow(r: RawListRow): AuctionListItem {
  const first = [...(r.auction_images ?? [])].sort((a, b) => a.position - b.position)[0];
  const { auction_images: _imgs, ...rest } = r;
  void _imgs;
  return { ...rest, image: first ? auctionImageUrl(first.storage_path) : null };
}

export const AUCTIONS_PAGE_SIZE = 24;

export async function getAuctions({
  q,
  category,
  region,
  sort = "slutter",
  ended = false,
  sellerId,
  page = 1,
}: {
  q?: string;
  category?: string;
  region?: string;
  sort?: "slutter" | "nyeste";
  ended?: boolean;
  sellerId?: string;
  page?: number;
}) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let query = supabase.from("auctions").select(LIST_SELECT, { count: "exact" });

  if (ended) query = query.or(`status.neq.active,ends_at.lte.${now}`);
  else query = query.eq("status", "active").gt("ends_at", now);

  if (category) query = query.eq("category", category);
  if (region) query = query.eq("region", region);
  if (sellerId) query = query.eq("seller_id", sellerId);
  if (q) query = query.ilike("title", `%${q.replace(/[%_,()*\\]/g, " ").trim()}%`);

  if (ended) query = query.order("ends_at", { ascending: false });
  else if (sort === "nyeste") query = query.order("created_at", { ascending: false });
  else query = query.order("ends_at", { ascending: true });

  const from = (page - 1) * AUCTIONS_PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + AUCTIONS_PAGE_SIZE - 1);
  if (error) {
    console.error("getAuctions", error);
    return { auctions: [] as AuctionListItem[], total: 0 };
  }
  return { auctions: ((data ?? []) as unknown as RawListRow[]).map(mapListRow), total: count ?? 0 };
}

export type AuctionDetail = AuctionListItem & {
  seller_id: string;
  description: string | null;
  min_increment: number;
  duration_days: number;
  region: string | null;
  winner_id: string | null;
  high_bidder_id: string | null;
  created_at: string;
  images: { url: string; width: number | null; height: number | null }[];
  seller: { username: string; display_name: string | null; avatar_url: string | null; flex: number } | null;
};

export async function getAuction(id: string): Promise<AuctionDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("auctions")
    .select(
      `id, seller_id, title, description, category, condition, start_price, min_increment, current_price, buy_now_price,
       bid_count, duration_days, ends_at, status, final_price, city, region, can_ship, winner_id, high_bidder_id, created_at,
       auction_images ( storage_path, width, height, position ),
       seller:profiles!auctions_seller_id_fkey ( username, display_name, avatar_url, flex )`
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const raw = data as unknown as Omit<AuctionDetail, "images" | "image"> & {
    auction_images: { storage_path: string; width: number | null; height: number | null; position: number }[] | null;
  };
  const images = [...(raw.auction_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ url: auctionImageUrl(i.storage_path), width: i.width, height: i.height }));
  const { auction_images: _imgs, ...rest } = raw;
  void _imgs;
  return { ...rest, images, image: images[0]?.url ?? null };
}

// Er auktionen slut? (status eller tiden er gået, selvom databasen ikke har lukket den endnu)
export function isEnded(a: { status: string; ends_at: string }) {
  return a.status !== "active" || new Date(a.ends_at).getTime() <= Date.now();
}

// Mindste næste bud
export function minNextBid(a: { current_price: number | null; start_price: number; min_increment: number }) {
  return a.current_price == null ? Math.max(1, a.start_price) : a.current_price + a.min_increment;
}
