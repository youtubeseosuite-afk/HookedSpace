// src/app/p/[id]/page.tsx
// OPDATERET (nyt logo). Side for ét opslag (delingslink). Kan ses uden login, hvis opslaget er offentligt.
// Giver preview med billede og tekst, når linket deles på Messenger, Facebook, SMS osv.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostById } from "@/lib/posts";
import { getCurrentProfile } from "@/lib/auth";
import PostCard from "@/components/post-card";
import { LogoBadge } from "@/components/logo";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return { title: "Opslag ikke fundet", robots: { index: false } };

  const name = post.author.display_name ?? post.author.username;
  const catchText = post.species
    ? [post.species.name, post.weight_kg && `${post.weight_kg} kg`, post.length_cm && `${post.length_cm} cm`]
        .filter(Boolean)
        .join(" · ")
    : "";
  const description = (post.body?.slice(0, 160) || catchText || `Se ${name}s opslag på HookedSpace`).trim();
  const title = catchText ? `${name}: ${catchText}` : `${name} på HookedSpace`;
  const image = post.images[0];

  return {
    title,
    description,
    alternates: { canonical: `/p/${post.id}` },
    robots: post.visibility === "public" ? undefined : { index: false },
    openGraph: {
      type: "article",
      siteName: "HookedSpace",
      title,
      description,
      url: `/p/${post.id}`,
      images: image ? [{ url: image.url, width: image.width ?? undefined, height: image.height ?? undefined }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const [post, { userId }] = await Promise.all([getPostById(id), getCurrentProfile()]);
  if (!post) notFound();

  const loggedIn = !!userId;

  return (
    <div className="min-h-dvh">
      <header className="bg-deep-900">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link href={loggedIn ? "/feed" : "/"} className="flex items-center gap-2 font-bold text-mist-50">
            <LogoBadge size="md" />
            HookedSpace
          </Link>
          {loggedIn ? (
            <Link href="/feed" className="rounded-lg px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800">
              Til feedet
            </Link>
          ) : (
            <Link
              href={`/login?next=/p/${post.id}`}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800"
            >
              Log ind
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
        <PostCard post={post} />

        {!loggedIn && (
          <section className="rounded-2xl bg-deep-900 p-6 text-center text-mist-50 shadow-sm">
            <h2 className="text-lg font-semibold">Er du også lystfisker?</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-reed-300">
              Opret en gratis profil, så kan du reagere, kommentere og dele dine egne ture og fangster.
            </p>
            <Link
              href={`/login?next=/p/${post.id}`}
              className="mt-4 inline-block rounded-lg bg-lure-400 px-6 py-2.5 font-semibold text-deep-950 hover:bg-lure-500"
            >
              Opret gratis profil
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
