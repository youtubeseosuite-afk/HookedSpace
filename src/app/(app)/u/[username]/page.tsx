// src/app/(app)/u/[username]/page.tsx
// NY FIL. Profilside: navn, by, erfaring, bio, tællere, følg-knap, trofævæg og brugerens opslag.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Trophy, Fish, Settings } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPosts, type FeedPost } from "@/lib/posts";
import PostCard from "@/components/post-card";
import FollowButton from "./follow-button";

const LEVEL_LABEL: Record<string, string> = {
  begynder: "Begynder",
  oevet: "Øvet",
  erfaren: "Erfaren",
  ekspert: "Ekspert",
};

type Params = { username: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 2 }).format(n);
}

function TrophyWall({ trophies }: { trophies: FeedPost[] }) {
  if (trophies.length === 0) return null;
  return (
    <section className="rounded-2xl bg-deep-900 p-4 text-mist-50 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Trophy className="h-5 w-5 text-lure-400" aria-hidden />
        Trofævæg
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {trophies.map((t) => (
          <div key={t.id} className="relative aspect-square overflow-hidden rounded-xl bg-deep-800">
            {t.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Fish className="h-10 w-10 text-reed-500" aria-hidden />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep-950/90 to-transparent p-2 pt-6">
              <p className="text-sm font-semibold text-lure-400">{t.species?.name}</p>
              <p className="text-xs text-mist-100">
                {[t.weight_kg != null && `${formatNumber(t.weight_kg)} kg`, t.length_cm != null && `${formatNumber(t.length_cm)} cm`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ foer?: string }>;
}) {
  const me = await requireProfile();
  const { username } = await params;
  const { foer } = await searchParams;
  const before = foer && !Number.isNaN(Date.parse(foer)) ? foer : undefined;

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, city, experience_level, bio")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!user) notFound();

  const isMe = user.id === me.id;
  const name = user.display_name ?? user.username;

  const [followersRes, followingRes, postsCountRes, iFollowRes, followsMeRes, trophiesRes, postsRes] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("follows").select("follower_id").eq("follower_id", me.id).eq("following_id", user.id).maybeSingle(),
    supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", me.id).maybeSingle(),
    before ? Promise.resolve(null) : getPosts({ userId: user.id, trophiesOnly: true, limit: 9 }),
    getPosts({ userId: user.id, before }),
  ]);

  const iFollow = !!iFollowRes.data;
  const followsMe = !!followsMeRes.data;
  const isFriend = iFollow && followsMe;

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
      {/* Profilhoved */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100">
        <div className="flex items-start gap-4">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-reed-500 text-3xl font-semibold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-deep-950">{name}</h1>
            <p className="text-sm text-deep-700">@{user.username}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {user.experience_level && (
                <span className="rounded-full bg-deep-900 px-2.5 py-1 font-medium text-lure-400">
                  {LEVEL_LABEL[user.experience_level] ?? user.experience_level}
                </span>
              )}
              {user.city && (
                <span className="flex items-center gap-1 rounded-full bg-mist-100 px-2.5 py-1 text-deep-800">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {user.city}
                </span>
              )}
              {isFriend && <span className="rounded-full bg-reed-300/40 px-2.5 py-1 font-medium text-deep-900">Ven</span>}
              {!isMe && followsMe && !iFollow && (
                <span className="rounded-full bg-mist-100 px-2.5 py-1 text-deep-800">Følger dig</span>
              )}
            </div>
          </div>
        </div>

        {user.bio && <p className="mt-4 whitespace-pre-wrap text-sm text-deep-900">{user.bio}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-mist-100 pt-4">
          <dl className="flex gap-5 text-sm">
            <div>
              <dt className="sr-only">Opslag</dt>
              <dd><span className="font-bold text-deep-950">{postsCountRes.count ?? 0}</span> <span className="text-deep-700">opslag</span></dd>
            </div>
            <div>
              <dt className="sr-only">Følgere</dt>
              <dd><span className="font-bold text-deep-950">{followersRes.count ?? 0}</span> <span className="text-deep-700">følgere</span></dd>
            </div>
            <div>
              <dt className="sr-only">Følger</dt>
              <dd><span className="font-bold text-deep-950">{followingRes.count ?? 0}</span> <span className="text-deep-700">følger</span></dd>
            </div>
          </dl>

          {isMe ? (
            <Link
              href="/indstillinger"
              className="flex items-center gap-2 rounded-lg bg-mist-100 px-4 py-2 text-sm font-semibold text-deep-900 hover:bg-mist-50"
            >
              <Settings className="h-4 w-4" aria-hidden />
              Rediger profil
            </Link>
          ) : (
            <FollowButton myId={me.id} targetId={user.id} initiallyFollowing={iFollow} followsMe={followsMe} />
          )}
        </div>
      </section>

      {trophiesRes && <TrophyWall trophies={trophiesRes.posts} />}

      {/* Opslag */}
      {postsRes.posts.length === 0 && !before && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-deep-700 shadow-sm ring-1 ring-mist-100">
          {isMe ? "Du har ikke delt noget endnu." : `${name} har ikke delt noget, du kan se.`}
        </div>
      )}

      {postsRes.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {postsRes.nextCursor && (
        <div className="flex justify-center pt-2">
          <Link
            href={`/u/${user.username}?foer=${encodeURIComponent(postsRes.nextCursor)}`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-deep-900 shadow-sm ring-1 ring-mist-100 hover:bg-mist-50"
          >
            Vis ældre opslag
          </Link>
        </div>
      )}
    </main>
  );
}
