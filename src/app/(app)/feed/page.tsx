// src/app/(app)/feed/page.tsx
// OPDATERET (faner: "Anbefalet" sorteret af algoritmen, og "Nyeste" i tidsrækkefølge).
// Anbefalet: venner, dit område, dine grupper og aktivitet vægtes sammen med alder (se supabase/012_feed_ranking.sql).

import type { Metadata } from "next";
import Link from "next/link";
import { ImagePlus, Fish, Sparkles, Clock } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getFeedPosts, getRankedFeed } from "@/lib/posts";
import PostCard from "@/components/post-card";
import ChallengeCard from "@/components/challenge-card";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ foer?: string; sortering?: string; side?: string }>;
}) {
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
