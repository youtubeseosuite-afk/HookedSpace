// src/app/(app)/feed/page.tsx
// OPDATERET. Rigtigt feed: viser opslag nyeste først, 10 ad gangen, med "Vis ældre opslag" nederst.

import type { Metadata } from "next";
import Link from "next/link";
import { ImagePlus, Fish } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getFeedPosts } from "@/lib/posts";
import PostCard from "@/components/post-card";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ foer?: string }>;
}) {
  const profile = await requireProfile();
  const { foer } = await searchParams;
  const before = foer && !Number.isNaN(Date.parse(foer)) ? foer : undefined;

  const { posts, nextCursor } = await getFeedPosts(before);
  const firstName = profile.display_name.split(" ")[0];

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
      {!before && (
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

      {posts.length === 0 && !before && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-mist-100">
          <Fish className="mx-auto h-10 w-10 text-reed-500" aria-hidden />
          <p className="mt-3 font-semibold text-deep-900">Der er ingen opslag endnu</p>
          <p className="mt-1 text-sm text-deep-700">Del din første tur eller fangst, så kommer der gang i feedet.</p>
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {nextCursor && (
        <div className="flex justify-center pt-2">
          <Link
            href={`/feed?foer=${encodeURIComponent(nextCursor)}`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-deep-900 shadow-sm ring-1 ring-mist-100 hover:bg-mist-50"
          >
            Vis ældre opslag
          </Link>
        </div>
      )}

      {before && (
        <div className="flex justify-center">
          <Link href="/feed" className="text-sm font-medium text-deep-700 hover:underline">
            Tilbage til nyeste
          </Link>
        </div>
      )}
    </main>
  );
}
