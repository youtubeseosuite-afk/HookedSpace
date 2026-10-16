// src/lib/posts.ts
// OPDATERET (ny getPostById() til delingssiden /p/[id]). Henter opslag (nyeste først, 10 ad gangen) og bygger billed-URL'er.
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
  created_at: string;
  author: { id: string; username: string; display_name: string | null; avatar_url: string | null };
  species: { name: string } | null;
  images: { url: string; width: number | null; height: number | null }[];
  tagged: { id: string; username: string; display_name: string | null }[];
  reaction_count: number;
  comment_count: number;
  reacted_by_me: boolean;
  viewer_id: string | null;
};

export const FEED_PAGE_SIZE = 10;

const POST_SELECT = `
  id, body, feeling, location_name, visibility, weight_kg, length_cm, released, is_trophy, created_at,
  author:profiles!posts_user_id_fkey ( id, username, display_name, avatar_url ),
  species ( name ),
  post_images ( storage_path, width, height, position ),
  post_tags ( tagged:profiles!post_tags_tagged_user_id_fkey ( id, username, display_name ) ),
  post_reactions ( count ),
  post_comments ( count )
`;

export function postImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${path}`;
}

type RawPost = Omit<
  FeedPost,
  "images" | "tagged" | "reaction_count" | "comment_count" | "reacted_by_me" | "viewer_id"
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
  };
}

// before = ISO-tidspunkt. Henter opslag ældre end dette (til "Vis ældre").
type GetPostsOptions = {
  id?: string;
  before?: string;
  userId?: string;
  trophiesOnly?: boolean;
  limit?: number;
};

// Fælles hentning til feed, profil og trofævæg
export async function getPosts({ id, before, userId, trophiesOnly, limit = FEED_PAGE_SIZE }: GetPostsOptions = {}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId = (claimsData?.claims?.sub as string | undefined) ?? null;

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (id) query = query.eq("id", id);
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
  const nextCursor = hasMore ? posts[posts.length - 1].created_at : null;

  return { posts, nextCursor };
}

export async function getFeedPosts(before?: string) {
  return getPosts({ before });
}

// Ét opslag. Returnerer null hvis det ikke findes, eller hvis brugeren ikke må se det.
// cache() gør, at siden og dens metadata deler samme hentning.
export const getPostById = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { posts } = await getPosts({ id, limit: 1 });
  return posts[0] ?? null;
});
