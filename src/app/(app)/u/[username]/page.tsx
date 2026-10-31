// src/app/(app)/u/[username]/page.tsx
// OPDATERET (Rediger profil er et tandhjul i hjørnet). Profilside: navn, by, erfaring, bio, tællere, følg-knap,
// fanen Opslag (badges, fiskepas, trofævæg, opslag) og fanen Billeder (galleri med alle brugerens billeder).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Trophy, Fish, Settings } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPosts, type FeedPost } from "@/lib/posts";
import PostCard from "@/components/post-card";
import FollowButton from "./follow-button";
import ProfileMenu from "./profile-menu";
import FlexMeter from "@/components/flex-meter";
import FishingPass, { type SpeciesItem, type SpeciesStat } from "@/components/fishing-pass";
import BadgeList, { type BadgeItem } from "@/components/badge-list";
import PhotoGallery, { type GalleryImage } from "@/components/photo-gallery";
import { postImageUrl } from "@/lib/posts";

const LEVEL_LABEL: Record<string, string> = {
  begynder: "Begynder",
  oevet: "Øvet",
  erfaren: "Erfaren",
  ekspert: "Ekspert",
};

type Params = { username: string };

const GALLERY_PAGE = 30;

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
  searchParams: Promise<{ foer?: string; fane?: string }>;
}) {
  const me = await requireProfile();
  const { username } = await params;
  const { foer, fane } = await searchParams;
  const before = foer && !Number.isNaN(Date.parse(foer)) ? foer : undefined;
  const tab: "opslag" | "billeder" = fane === "billeder" ? "billeder" : "opslag";
  const showExtras = tab === "opslag" && !before;

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, city, experience_level, bio, flex")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!user) notFound();

  const isMe = user.id === me.id;
  const name = user.display_name ?? user.username;

  const [
    followersRes,
    followingRes,
    postsCountRes,
    iFollowRes,
    followsMeRes,
    trophiesRes,
    postsRes,
    speciesRes,
    statsRes,
    allBadgesRes,
    userBadgesRes,
    imageCountRes,
    galleryRes,
    iBlockedRes,
  ] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("follows").select("follower_id").eq("follower_id", me.id).eq("following_id", user.id).maybeSingle(),
    supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", me.id).maybeSingle(),
    showExtras ? getPosts({ userId: user.id, trophiesOnly: true, limit: 9 }) : Promise.resolve(null),
    tab === "opslag" ? getPosts({ userId: user.id, before }) : Promise.resolve(null),
    showExtras ? supabase.from("species").select("id, name, water_type").order("name") : Promise.resolve(null),
    showExtras
      ? supabase
          .from("user_species_stats")
          .select("species_id, catches, best_weight_kg, best_length_cm")
          .eq("user_id", user.id)
      : Promise.resolve(null),
    showExtras
      ? supabase.from("badges").select("id, name, description, emoji, category, sort").order("sort")
      : Promise.resolve(null),
    showExtras ? supabase.from("user_badges").select("badge_id").eq("user_id", user.id) : Promise.resolve(null),
    // Antal billeder du må se (RLS skjuler billeder fra opslag, du ikke har adgang til)
    supabase.from("post_images").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    tab === "billeder"
      ? (() => {
          let q = supabase
            .from("post_images")
            .select("storage_path, width, height, post_id, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(GALLERY_PAGE + 1);
          if (before) q = q.lt("created_at", before);
          return q;
        })()
      : Promise.resolve(null),
    // Har jeg blokeret denne bruger?
    isMe
      ? Promise.resolve(null)
      : supabase.from("blocks").select("blocker_id").eq("blocker_id", me.id).eq("blocked_id", user.id).maybeSingle(),
  ]);

  // Galleri
  const galleryRows = (galleryRes?.data ?? []) as {
    storage_path: string;
    width: number | null;
    height: number | null;
    post_id: string;
    created_at: string;
  }[];
  const galleryHasMore = galleryRows.length > GALLERY_PAGE;
  const galleryPage = galleryRows.slice(0, GALLERY_PAGE);
  const galleryImages: GalleryImage[] = galleryPage.map((r) => ({
    url: postImageUrl(r.storage_path),
    postId: r.post_id,
    width: r.width,
    height: r.height,
  }));
  const galleryNext = galleryHasMore
    ? `/u/${user.username}?fane=billeder&foer=${encodeURIComponent(galleryPage[galleryPage.length - 1].created_at)}`
    : null;
  const imageCount = imageCountRes.count ?? 0;

  const iFollow = !!iFollowRes.data;
  const followsMe = !!followsMeRes.data;
  const iBlocked = !!iBlockedRes?.data;
  const isFriend = iFollow && followsMe;

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
      {/* Profilhoved */}
      <section className="relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100">
        {isMe && (
          <Link
            href="/indstillinger"
            aria-label="Rediger profil"
            title="Rediger profil"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-deep-700 hover:bg-mist-100 hover:text-deep-950"
          >
            <Settings className="h-5 w-5" aria-hidden />
          </Link>
        )}
        <div className="flex items-start gap-4">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-reed-500 text-3xl font-semibold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className={`min-w-0 flex-1 ${isMe ? "pr-8" : ""}`}>
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

        <FlexMeter points={user.flex ?? 0} />

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

          {isMe ? null : (
            <div className="flex items-center gap-2">
              {iBlocked ? (
                <span className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Du har blokeret {name}</span>
              ) : (
                <FollowButton myId={me.id} targetId={user.id} initiallyFollowing={iFollow} followsMe={followsMe} />
              )}
              <ProfileMenu userId={user.id} name={name} initiallyBlocked={iBlocked} />
            </div>
          )}
        </div>
      </section>

      {/* Faner */}
      <nav className="flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-mist-100" aria-label="Profil">
        {(
          [
            { key: "opslag", label: "Opslag", href: `/u/${user.username}` },
            { key: "billeder", label: "Billeder", href: `/u/${user.username}?fane=billeder`, count: imageCount },
          ] as const
        ).map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
              tab === t.key ? "bg-deep-900 text-mist-50" : "text-deep-700 hover:bg-mist-50"
            }`}
          >
            {t.label}
            {"count" in t && (
              <span
                className={`rounded-full px-1.5 text-xs ${tab === t.key ? "bg-deep-800 text-lure-400" : "bg-mist-100 text-deep-700"}`}
              >
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === "billeder" && (
        <PhotoGallery
          images={galleryImages}
          nextHref={galleryNext}
          emptyText={isMe ? "Du har ikke delt nogen billeder endnu." : `${name} har ikke delt nogen billeder, du kan se.`}
        />
      )}

      {showExtras && (
        <>
          <BadgeList
            allBadges={(allBadgesRes?.data ?? []) as BadgeItem[]}
            earnedIds={(userBadgesRes?.data ?? []).map((b) => b.badge_id)}
            isMe={isMe}
          />
          <FishingPass
            species={(speciesRes?.data ?? []) as SpeciesItem[]}
            stats={(statsRes?.data ?? []) as SpeciesStat[]}
            isMe={isMe}
          />
        </>
      )}

      {trophiesRes && <TrophyWall trophies={trophiesRes.posts} />}

      {/* Opslag */}
      {postsRes && postsRes.posts.length === 0 && !before && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-deep-700 shadow-sm ring-1 ring-mist-100">
          {isMe ? "Du har ikke delt noget endnu." : `${name} har ikke delt noget, du kan se.`}
        </div>
      )}

      {postsRes?.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {postsRes?.nextCursor && (
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
