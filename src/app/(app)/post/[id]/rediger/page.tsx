// src/app/(app)/post/[id]/rediger/page.tsx
// NY FIL. Rediger dit eget opslag: tekst, billeder, følelse, sted, tags, fangstdetaljer og synlighed.
// Kun forfatteren kan åbne siden. Delinger af andres opslag kan ikke redigeres her.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { postImageUrl } from "@/lib/posts";
import type { FeelingKey } from "@/lib/feelings";
import PostForm, { type EditablePost, type Friend, type PostGroup, type Species } from "../../ny/post-form";

export const metadata: Metadata = { title: "Rediger opslag" };

type Params = { id: string };

export default async function EditPostPage({ params }: { params: Promise<Params> }) {
  const profile = await requireProfile();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, user_id, body, feeling, location_name, visibility, species_id, weight_kg, length_cm, released, is_trophy, is_share, group:groups!posts_group_id_fkey ( id, slug, name, privacy ), post_images ( id, storage_path, width, height, position ), post_tags ( tagged_user_id )"
    )
    .eq("id", id)
    .maybeSingle();

  // Kun dine egne opslag, og ikke delinger
  if (!post || post.user_id !== profile.id || post.is_share) notFound();

  const [{ data: species }, { data: following }, { data: followers }] = await Promise.all([
    supabase.from("species").select("id, name, water_type").order("name"),
    supabase.from("follows").select("following_id").eq("follower_id", profile.id),
    supabase.from("follows").select("follower_id").eq("following_id", profile.id),
  ]);

  // Venner = dem jeg følger, som også følger mig
  const followerIds = new Set((followers ?? []).map((f) => f.follower_id));
  const friendIds = (following ?? []).map((f) => f.following_id).filter((fid) => followerIds.has(fid));
  let friends: Friend[] = [];
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", friendIds)
      .order("display_name");
    friends = (data ?? []) as Friend[];
  }

  const images = [...((post.post_images ?? []) as { id: string; storage_path: string; width: number | null; height: number | null; position: number }[])]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ id: i.id, storage_path: i.storage_path, url: postImageUrl(i.storage_path), width: i.width, height: i.height }));

  const existing: EditablePost = {
    id: post.id,
    body: post.body,
    feeling: post.feeling as FeelingKey | null,
    location_name: post.location_name,
    visibility: post.visibility as EditablePost["visibility"],
    species_id: post.species_id,
    weight_kg: post.weight_kg,
    length_cm: post.length_cm,
    released: post.released,
    is_trophy: post.is_trophy,
    images,
    tagged: ((post.post_tags ?? []) as { tagged_user_id: string }[]).map((t) => t.tagged_user_id),
  };

  const group = (post.group as unknown as PostGroup | null) ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="mb-4 text-2xl font-bold text-deep-900">Rediger opslag</h1>
      <PostForm
        userId={profile.id}
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        species={(species ?? []) as Species[]}
        friends={friends}
        group={group}
        existing={existing}
      />
    </main>
  );
}
