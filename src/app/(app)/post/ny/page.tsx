// src/app/(app)/post/ny/page.tsx
// OPDATERET (?gruppe=<adresse> skriver opslaget i en gruppe, hvis du er medlem). Siden "Ny Post". Henter arter og brugerens venner (gensidig følg) og viser opslagsformularen.

import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PostForm, { type Friend, type Species, type PostGroup } from "./post-form";

export const metadata: Metadata = {
  title: "Ny Post",
};

export default async function NyPostPage({ searchParams }: { searchParams: Promise<{ gruppe?: string }> }) {
  const profile = await requireProfile();
  const { gruppe } = await searchParams;
  const supabase = await createClient();

  // Opslag i en gruppe: kun hvis du er aktivt medlem
  let group: PostGroup | null = null;
  let notMember = false;
  if (gruppe) {
    const { data: g } = await supabase.from("groups").select("id, slug, name, privacy").eq("slug", gruppe).maybeSingle();
    if (g) {
      const { data: m } = await supabase
        .from("group_members")
        .select("status")
        .eq("group_id", g.id)
        .eq("user_id", profile.id)
        .maybeSingle();
      if (m?.status === "active") group = g as PostGroup;
      else notMember = true;
    }
  }

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
      <h1 className="mb-4 text-2xl font-bold text-deep-900">{group ? `Ny post i ${group.name}` : "Ny Post"}</h1>
      {notMember && (
        <p className="mb-4 rounded-lg bg-lure-400/20 px-3 py-2 text-sm text-deep-900">
          Du er ikke medlem af gruppen, så opslaget bliver lagt på din egen profil.{" "}
          <Link href={`/g/${gruppe}`} className="font-semibold underline">
            Gå til gruppen
          </Link>
        </p>
      )}
      <PostForm
        group={group}
        userId={profile.id}
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        species={(species ?? []) as Species[]}
        friends={friends}
      />
    </main>
  );
}
