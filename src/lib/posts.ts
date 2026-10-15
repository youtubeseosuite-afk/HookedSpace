// src/lib/posts.ts
// OPDATERET (ny getPosts() til profil og trofævæg). Henter opslag (nyeste først, 10 ad gangen) og bygger billed-URL'er.
// Row Level Security i databasen bestemmer, hvilke opslag brugeren må se.

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
};

export const FEED_PAGE_SIZE = 10;

const POST_SELECT = `
  id, body, feeling, location_name, visibility, weight_kg, length_cm, released, is_trophy, created_at,
  author:profiles!posts_user_id_fkey ( id, username, display_name, avatar_url ),
  species ( name ),
  post_images ( storage_path, width, height, position ),
  post_tags ( tagged:profiles!post_tags_tagged_user_id_fkey ( id, username, display_name ) )
`;

export function postImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${path}`;
}

type RawPost = Omit<FeedPost, "images" | "tagged"> & {
  post_images: { storage_path: string; width: number | null; height: number | null; position: number }[] | null;
  post_tags: { tagged: FeedPost["tagged"][number] | null }[] | null;
};

function mapPost(p: RawPost): FeedPost {
  const { post_images, post_tags, ...rest } = p;
  return {
    ...rest,
    images: [...(post_images ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ url: postImageUrl(i.storage_path), width: i.width, height: i.height })),
    tagged: (post_tags ?? []).map((t) => t.tagged).filter((t): t is FeedPost["tagged"][number] => !!t),
  };
}

// before = ISO-tidspunkt. Henter opslag ældre end dette (til "Vis ældre").
type GetPostsOptions = {
  before?: string;
  userId?: string;
  trophiesOnly?: boolean;
  limit?: number;
};

// Fælles hentning til feed, profil og trofævæg
export async function getPosts({ before, userId, trophiesOnly, limit = FEED_PAGE_SIZE }: GetPostsOptions = {}) {
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) query = query.lt("created_at", before);
  if (userId) query = query.eq("user_id", userId);
  if (trophiesOnly) query = query.eq("is_trophy", true);

  const { data, error } = await query;
  if (error) {
    console.error("getPosts", error);
    return { posts: [] as FeedPost[], nextCursor: null as string | null };
  }

  const rows = (data ?? []) as unknown as RawPost[];
  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit).map(mapPost);
  const nextCursor = hasMore ? posts[posts.length - 1].created_at : null;

  return { posts, nextCursor };
}

export async function getFeedPosts(before?: string) {
  return getPosts({ before });
}
