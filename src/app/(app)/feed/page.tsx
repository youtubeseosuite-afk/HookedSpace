// src/app/(app)/feed/page.tsx
// OPDATERET (gæster ser de 15 nyeste offentlige opslag og en opfordring til at oprette profil).
// Faner for medlemmer: "Anbefalet" sorteret af algoritmen, og "Nyeste" i tidsrækkefølge.
// Anbefalet: venner, dit område, dine grupper og aktivitet vægtes sammen med alder (se supabase/012_feed_ranking.sql).

import type { Metadata } from "next";
import Link from "next/link";
import { ImagePlus, Fish, Sparkles, Clock } from "lucide-react";
import { getCurrentProfile, requireProfile } from "@/lib/auth";
import { getFeedPosts, getPosts, getRankedFeed } from "@/lib/posts";
import { LogoBadge } from "@/components/logo";
import PostCard from "@/components/post-card";
import ChallengeCard from "@/components/challenge-card";

export const metadata: Metadata = {
  title: "Feed",
  // Feedet skal ikke i Google (det skifter hele tiden). Delte opslag og grupper må gerne.
  robots: { index: false, follow: true },
};

const GUEST_LIMIT = 15;

async function GuestFeed() {
  const { posts } = await getPosts({ feedGroupIds: [], limit: GUEST_LIMIT });

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
      {/* Velkomst kun for gæster */}
      <section className="overflow-hidden rounded-2xl bg-deep-900 text-mist-50 shadow-sm">
        <div className="flex items-start gap-4 p-5">
          <LogoBadge size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold">Det sociale netværk for danske lystfiskere</h1>
            <p className="mt-1 text-sm text-reed-300">
              Se hvad der bliver fanget lige nu. Opret en gratis profil for at dele dine egne fangster, give Knæk og bræk og
              følge andre fiskere.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/login?opret=1"
                className="rounded-lg bg-lure-400 px-4 py-2.5 text-sm font-bold text-deep-950 hover:bg-lure-500"
              >
                Opret gratis profil
              </Link>
              <Link href="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold ring-1 ring-reed-300/40 hover:bg-deep-800">
                Log ind
              </Link>
            </div>
          </div>
        </div>
      </section>

      {posts.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-mist-100">
          <Fish className="mx-auto h-10 w-10 text-reed-500" aria-hidden />
          <p className="mt-3 font-semibold text-deep-900">Der er ingen offentlige opslag endnu</p>
          <p className="mt-1 text-sm text-deep-700">Bliv den første til at dele en fangst.</p>
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {posts.length > 0 && (
        <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-mist-100">
          <Fish className="mx-auto h-10 w-10 text-reed-500" aria-hidden />
          <h2 className="mt-3 text-lg font-bold text-deep-950">Der er meget mere at se</h2>
          <p className="mt-1 text-sm text-deep-700">
            Opret en gratis profil for at se hele feedet, følge fiskere i dit område og dele dine egne fangster.
          </p>
          <Link
            href="/login?opret=1"
            className="mt-4 inline-block rounded-lg bg-lure-400 px-5 py-2.5 text-sm font-bold text-deep-950 hover:bg-lure-500"
          >
            Opret gratis profil
          </Link>
        </section>
      )}
    </main>
  );
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ foer?: string; sortering?: string; side?: string }>;
}) {
  const { userId } = await getCurrentProfile();
  if (!userId) return <GuestFeed />;

  const profile = await requireProfile();
  const { foer, sortering, side } = await searchParams;
  const mode: "anbefalet" | "nyeste" = sortering === "nyeste" ? "nyeste" : "anbefalet";
  const before = foer && !Number.isNaN(Date.parse(foer)) ? foer : undefined;
  const page = Math.max(0, Math.min(50, Number.parseInt(side ?? "0", 10) || 0));
  const isFirstPage = mode === "anbefalet" ? page === 0 : !before;

  const firstName = profile.display_name.split(" ")[0];

  let posts;
  let nextHref: string | null = null;
  if (mode === "anbefalet") {
    const res = await getRankedFeed(page);
    posts = res.posts;
    if (res.hasMore) nextHref = `/feed?side=${page + 1}`;
  } else {
    const res = await getFeedPosts(before);
    posts = res.posts;
    if (res.nextCursor) nextHref = `/feed?sortering=nyeste&foer=${encodeURIComponent(res.nextCursor)}`;
  }

  const tabClass = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
      active ? "bg-deep-900 text-mist-50" : "text-deep-700 hover:bg-mist-50"
    }`;

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
      {/* Faner */}
      <nav className="flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-mist-100" aria-label="Sortering">
        <Link href="/feed" aria-current={mode === "anbefalet" ? "page" : undefined} className={tabClass(mode === "anbefalet")}>
          <Sparkles className="h-4 w-4" aria-hidden />
          Anbefalet
        </Link>
        <Link
          href="/feed?sortering=nyeste"
          aria-current={mode === "nyeste" ? "page" : undefined}
          className={tabClass(mode === "nyeste")}
        >
          <Clock className="h-4 w-4" aria-hidden />
          Nyeste
        </Link>
      </nav>

      {isFirstPage && (
        <Link
          href="/post/ny"
          className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100 transition hover:ring-deep-700/30"
        >
          <span className="flex-1 rounded-full bg-mist-100 px-4 py-2.5 text-deep-700">
            Hvad sker der ved vandet, {firstName}?
          </span>
          <ImagePlus className="h-6 w-6 text-reed-500" aria-hidden />
        </Link>
      )}

      {isFirstPage && <ChallengeCard />}

      {posts.length === 0 && isFirstPage && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-mist-100">
          <Fish className="mx-auto h-10 w-10 text-reed-500" aria-hidden />
          <p className="mt-3 font-semibold text-deep-900">
            {mode === "anbefalet" ? "Ingen nye opslag de seneste 3 uger" : "Der er ingen opslag endnu"}
          </p>
          <p className="mt-1 text-sm text-deep-700">
            Del din første tur eller fangst, eller find andre fiskere at følge.
          </p>
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {nextHref ? (
        <div className="flex justify-center pt-2">
          <Link
            href={nextHref}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-deep-900 shadow-sm ring-1 ring-mist-100 hover:bg-mist-50"
          >
            {mode === "anbefalet" ? "Vis flere" : "Vis ældre opslag"}
          </Link>
        </div>
      ) : (
        mode === "anbefalet" &&
        posts.length > 0 && (
          <div className="flex justify-center pt-2">
            <Link href="/feed?sortering=nyeste" className="text-sm font-medium text-deep-700 hover:underline">
              Du er helt opdateret. Se ældre opslag under Nyeste
            </Link>
          </div>
        )
      )}

      {!isFirstPage && (
        <div className="flex justify-center">
          <Link href={mode === "anbefalet" ? "/feed" : "/feed?sortering=nyeste"} className="text-sm font-medium text-deep-700 hover:underline">
            Tilbage til toppen
          </Link>
        </div>
      )}
    </main>
  );
}
