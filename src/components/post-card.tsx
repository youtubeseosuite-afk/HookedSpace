// src/components/post-card.tsx
// OPDATERET (reaktioner og kommentarer nederst). Viser ét opslag: forfatter, følelse, taggede venner, sted, tekst, fangstdetaljer og billeder (1–5).

import Link from "next/link";
import { Globe, Users, Lock, Fish, Trophy, MapPin } from "lucide-react";
import type { FeedPost } from "@/lib/posts";
import { getFeeling } from "@/lib/feelings";
import PostActions from "@/components/post-actions";

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />;
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-reed-500 text-sm font-semibold text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function timeAgo(iso: string) {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("da", { numeric: "auto" });
  if (abs < 60) return "lige nu";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(diffSec / 86400), "day");
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: abs > 300 * 86400 ? "numeric" : undefined,
    timeZone: "Europe/Copenhagen",
  });
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 2 }).format(n);
}

const VIS_ICON = { public: Globe, followers: Users, private: Lock } as const;
const VIS_LABEL = { public: "Offentlig", followers: "Følgere", private: "Kun mig" } as const;

function ImageGrid({ images }: { images: FeedPost["images"] }) {
  const n = images.length;
  if (n === 0) return null;

  // Layout som på Facebook: 1 stort, 2 side om side, 3 = 1 stort + 2, 4 = 2x2, 5 = 2 + 3
  const layouts: Record<number, string[]> = {
    1: ["col-span-6"],
    2: ["col-span-3", "col-span-3"],
    3: ["col-span-6", "col-span-3", "col-span-3"],
    4: ["col-span-3", "col-span-3", "col-span-3", "col-span-3"],
    5: ["col-span-3", "col-span-3", "col-span-2", "col-span-2", "col-span-2"],
  };
  const spans = layouts[n] ?? layouts[5];

  return (
    <div className="grid grid-cols-6 gap-0.5 bg-mist-100">
      {images.map((img, i) => (
        <a
          key={img.url}
          href={img.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${spans[i]} block overflow-hidden bg-mist-100`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt=""
            loading="lazy"
            width={img.width ?? undefined}
            height={img.height ?? undefined}
            className={`w-full object-cover ${n === 1 ? "h-auto max-h-[600px]" : "aspect-square h-full"}`}
          />
        </a>
      ))}
    </div>
  );
}

export default function PostCard({ post }: { post: FeedPost }) {
  const name = post.author.display_name ?? post.author.username;
  const feeling = getFeeling(post.feeling);
  const VisIcon = VIS_ICON[post.visibility];
  const isCatch = !!post.species;

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
      <header className="flex gap-3 p-4">
        <Link href={`/u/${post.author.username}`}>
          <Avatar name={name} url={post.author.avatar_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-deep-700">
            <Link href={`/u/${post.author.username}`} className="font-semibold text-deep-950 hover:underline">
              {name}
            </Link>
            {feeling && (
              <>
                {" "}føler sig {feeling.emoji} <span className="font-medium text-deep-900">{feeling.label}</span>
              </>
            )}
            {post.tagged.length > 0 && (
              <>
                {" "}med{" "}
                {post.tagged.map((t, i) => (
                  <span key={t.id}>
                    {i > 0 && (i === post.tagged.length - 1 ? " og " : ", ")}
                    <Link href={`/u/${t.username}`} className="font-medium text-deep-900 hover:underline">
                      {t.display_name ?? t.username}
                    </Link>
                  </span>
                ))}
              </>
            )}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-deep-700">
            <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
            <span aria-hidden>·</span>
            <VisIcon className="h-3.5 w-3.5" aria-label={VIS_LABEL[post.visibility]} />
            {post.location_name && (
              <>
                <span aria-hidden>·</span>
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                <span>{post.location_name}</span>
              </>
            )}
          </p>
        </div>
      </header>

      {post.body && (
        <p className="whitespace-pre-wrap break-words px-4 pb-3 text-[15px] leading-relaxed text-deep-950">{post.body}</p>
      )}

      {isCatch && (
        <div className="mx-4 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-deep-900 px-4 py-3 text-sm text-mist-50">
          <span className="flex items-center gap-2 font-semibold text-lure-400">
            <Fish className="h-4 w-4" aria-hidden />
            {post.species!.name}
          </span>
          {post.weight_kg != null && <span>{formatNumber(post.weight_kg)} kg</span>}
          {post.length_cm != null && <span>{formatNumber(post.length_cm)} cm</span>}
          {post.released != null && <span className="text-reed-300">{post.released ? "Genudsat" : "Hjemtaget"}</span>}
          {post.is_trophy && (
            <span className="flex items-center gap-1 text-lure-400">
              <Trophy className="h-4 w-4" aria-hidden />
              Trofæ
            </span>
          )}
        </div>
      )}

      <ImageGrid images={post.images} />

      <PostActions
        postId={post.id}
        postOwnerId={post.author.id}
        viewerId={post.viewer_id}
        initialReacted={post.reacted_by_me}
        initialReactionCount={post.reaction_count}
        initialCommentCount={post.comment_count}
      />
    </article>
  );
}
