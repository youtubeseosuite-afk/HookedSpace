// src/app/(app)/post/ny/page.tsx
// NY FIL. Siden "Ny Post". Henter arter og brugerens venner (gensidig følg) og viser opslagsformularen.

import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PostForm, { type Friend, type Species } from "./post-form";

export const metadata: Metadata = {
  title: "Ny Post",
};

export default async function NyPostPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: species }, { data: following }, { data: followers }] = await Promise.all([
    supabase.from("species").select("id, name, water_type").order("name"),
    supabase.from("follows").select("following_id").eq("follower_id", profile.id),
    supabase.from("follows").select("follower_id").eq("following_id", profile.id),
  ]);

  // Venner = dem jeg følger, som også følger mig
  const followerIds = new Set((followers ?? []).map((f) => f.follower_id));
  const friendIds = (following ?? []).map((f) => f.following_id).filter((id) => followerIds.has(id));

  let friends: Friend[] = [];
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", friendIds)
      .order("display_name");
    friends = (data ?? []) as Friend[];
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="mb-4 text-2xl font-bold text-deep-900">Ny Post</h1>
      <PostForm
        userId={profile.id}
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        species={(species ?? []) as Species[]}
        friends={friends}
      />
    </main>
  );
}
