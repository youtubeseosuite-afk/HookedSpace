// src/lib/posts.ts
// OPDATERET (rangeret feed "Anbefalet" via ranked_feed i databasen, med begrundelse og variation). Henter opslag (nyeste først, 10 ad gangen) og bygger billed-URL'er.
// Row Level Security i databasen bestemmer, hvilke opslag brugeren må se.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type FeedPost = {
  id: string;
  body: string | null;
  feeling: string | null;
  location_name: string | null;
  visibility: "public" | "followers" | "private";
  weight_kg: number | null;
  length_cm: number | null;
  released: boolean | null;
  is_trophy: boolean;
  is_pr: boolean;
  is_new_species: boolean;
  created_at: string;
  author: { id: string; username: string; display_name: string | null; avatar_url: string | null };
  species: { name: string } | null;
  images: { url: string; width: number | null; height: number | null }[];
  tagged: { id: string; username: string; display_name: string | null }[];
  reaction_count: number;
  comment_count: number;
  reacted_by_me: boolean;
  viewer_id: string | null;
  is_share: boolean;
  shared_post_id: string | null;
  // Originalen, hvis dette er en deling. null hvis den er slettet eller ikke længere må ses.
  shared: FeedPost | null;
  // Gruppen opslaget er skrevet i (null = almindeligt opslag)
  group: { slug: string; name: string; privacy: "public" | "private" } | null;
  // Hvorfor opslaget vises i det anbefalede feed (friend, following, group, local, region, tagged)
  reason?: string | null;
};

export const FEED_PAGE_SIZE = 10;

const POST_SELECT = `
  id, body, feeling, location_name, visibility, weight_kg, length_cm, released, is_trophy, created_at,
  is_share, shared_post_id, is_pr, is_new_species,
  author:profiles!posts_user_id_fkey ( id, username, display_name, avatar_url ),
  species ( name ),
  post_images ( storage_path, width, height, position ),
  post_tags ( tagged:profiles!post_tags_tagged_user_id_fkey ( id, username, display_name ) ),
  post_reactions ( count ),
  post_comments ( count ),
  group:groups!posts_group_id_fkey ( slug, name, privacy )
`;

export function postImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${path}`;
}

type RawPost = Omit<
  FeedPost,
  "images" | "tagged" | "reaction_count" | "comment_count" | "reacted_by_me" | "viewer_id" | "shared"
> & {
  post_images: { storage_path: string; width: number | null; height: number | null; position: number }[] | null;
  post_tags: { tagged: FeedPost["tagged"][number] | null }[] | null;
  post_reactions: { count: number }[] | null;
  post_comments: { count: number }[] | null;
};

function mapPost(p: RawPost, viewerId: string | null, myReactions: Set<string>): FeedPost {
  const { post_images, post_tags, post_reactions, post_comments, ...rest } = p;
  return {
    ...rest,
    images: [...(post_images ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ url: postImageUrl(i.storage_path), width: i.width, height: i.height })),
    tagged: (post_tags ?? []).map((t) => t.tagged).filter((t): t is FeedPost["tagged"][number] => !!t),
    reaction_count: post_reactions?.[0]?.count ?? 0,
    comment_count: post_comments?.[0]?.count ?? 0,
    reacted_by_me: myReactions.has(p.id),
    viewer_id: viewerId,
    shared: null,
  };
}

// before = ISO-tidspunkt. Henter opslag ældre end dette (til "Vis ældre").
type GetPostsOptions = {
  id?: string;
  ids?: string[];
  groupId?: string;
  // Feed: kun gruppeopslag fra disse grupper (opslag uden gruppe vises altid)
  feedGroupIds?: string[];
  before?: string;
  userId?: string;
  trophiesOnly?: boolean;
  limit?: number;
};

// Fælles hentning til feed, profil og trofævæg
export async function getPosts({
  id,
  ids,
  groupId,
  feedGroupIds,
  before,
  userId,
  trophiesOnly,
  limit = FEED_PAGE_SIZE,
}: GetPostsOptions = {}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId = (claimsData?.claims?.sub as string | undefined) ?? null;

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (id) query = query.eq("id", id);
  if (ids) query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  if (groupId) query = query.eq("group_id", groupId);
  if (feedGroupIds) {
    query =
      feedGroupIds.length > 0
        ? query.or(`group_id.is.null,group_id.in.(${feedGroupIds.join(",")})`)
        : query.is("group_id", null);
  }
  if (before) query = query.lt("created_at", before);
  if (userId) query = query.eq("user_id", userId);
  if (trophiesOnly) query = query.eq("is_trophy", true);

  const { data, error } = await query;
  if (error) {
    console.error("getPosts", error);
    return { posts: [] as FeedPost[], nextCursor: null as string | null };
  }

  const rows = ((data ?? []) as unknown as RawPost[]).slice(0, limit + 1);
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);

  // Hvilke af opslagene har jeg selv reageret på?
  let myReactions = new Set<string>();
  if (viewerId && pageRows.length > 0) {
    const { data: mine } = await supabase
      .from("post_reactions")
      .select("post_id")
      .eq("user_id", viewerId)
      .in("post_id", pageRows.map((r) => r.id));
    myReactions = new Set((mine ?? []).map((r) => r.post_id));
  }

  const posts = pageRows.map((r) => mapPost(r, viewerId, myReactions));

  // Hent originalerne til delte opslag. RLS sørger for, at man kun får dem, man må se.
  const originalIds = [...new Set(posts.map((p) => p.shared_post_id).filter((x): x is string => !!x))];
  if (originalIds.length > 0) {
    const { data: originals } = await supabase.from("posts").select(POST_SELECT).in("id", originalIds);
    const byId = new Map(
      ((originals ?? []) as unknown as RawPost[]).map((o) => [o.id, mapPost(o, viewerId, new Set())])
    );
    for (const p of posts) {
      if (p.shared_post_id) p.shared = byId.get(p.shared_post_id) ?? null;
    }
  }

  const nextCursor = hasMore ? posts[posts.length - 1].created_at : null;

  return { posts, nextCursor };
}

// Feedet: almindelige opslag + opslag fra de grupper, du er medlem af
export async function getFeedPosts(before?: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId = claimsData?.claims?.sub as string | undefined;
  let feedGroupIds: string[] = [];
  if (viewerId) {
    const { data } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", viewerId)
      .eq("status", "active");
    feedGroupIds = (data ?? []).map((r) => r.group_id);
  }
  return getPosts({ before, feedGroupIds });
}

// Ét opslag. Returnerer null hvis det ikke findes, eller hvis brugeren ikke må se det.
// cache() gør, at siden og dens metadata deler samme hentning.
export const getPostById = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { posts } = await getPosts({ id, limit: 1 });
  return posts[0] ?? null;
});

// Undgå at den samme person står flere gange lige efter hinanden
function diversify(posts: FeedPost[]) {
  const pool = [...posts];
  const out: FeedPost[] = [];
  while (pool.length > 0) {
    const last = out[out.length - 1]?.author.id;
    const idx = pool.findIndex((p) => p.author.id !== last);
    out.push(pool.splice(idx === -1 ? 0 : idx, 1)[0]);
  }
  return out;
}

// "Anbefalet": opslag sorteret efter relation, område, aktivitet og alder (se supabase/012_feed_ranking.sql)
export async function getRankedFeed(page: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ranked_feed", {
    p_limit: FEED_PAGE_SIZE + 1,
    p_offset: page * FEED_PAGE_SIZE,
  });
  if (error || !data) {
    if (error) console.error("getRankedFeed", error);
    return { posts: [] as FeedPost[], hasMore: false };
  }

  const rows = data as { post_id: string; score: number; reason: string | null }[];
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const pageRows = rows.slice(0, FEED_PAGE_SIZE);
  if (pageRows.length === 0) return { posts: [] as FeedPost[], hasMore: false };

  const { posts } = await getPosts({ ids: pageRows.map((r) => r.post_id), limit: FEED_PAGE_SIZE });
  const byId = new Map(posts.map((p) => [p.id, p]));
  const ordered: FeedPost[] = [];
  for (const r of pageRows) {
    const p = byId.get(r.post_id);
    if (p) ordered.push({ ...p, reason: r.reason });
  }

  return { posts: diversify(ordered), hasMore };
}
