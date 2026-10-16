// src/app/(app)/g/[slug]/page.tsx
// NY FIL. Gruppeside: navn, beskrivelse, regler, medlemskab (anmod / afventer / medlem) og gruppens opslag.
// Private grupper: kun medlemmer kan se opslagene. Admins ser antal ventende anmodninger.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Lock, Users, MapPin, ScrollText, ImagePlus, Shield } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPosts } from "@/lib/posts";
import PostCard from "@/components/post-card";
import JoinPanel from "./join-panel";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("name").eq("slug", slug).maybeSingle();
  return { title: data?.name ?? "Gruppe" };
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ foer?: string }>;
}) {
  const me = await requireProfile();
  const { slug } = await params;
  const { foer } = await searchParams;
  const before = foer && !Number.isNaN(Date.parse(foer)) ? foer : undefined;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, slug, name, description, city, privacy, member_count, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!group) notFound();

  const [{ data: rules }, { data: membership }] = await Promise.all([
    supabase.from("group_rules").select("id, title, body").eq("group_id", group.id).order("position"),
    supabase
      .from("group_members")
      .select("role, status")
      .eq("group_id", group.id)
      .eq("user_id", me.id)
      .maybeSingle(),
  ]);

  const status: "none" | "pending" | "active" = membership?.status ?? "none";
  const isMember = status === "active";
  const isAdmin = isMember && membership?.role === "admin";
  const canSeePosts = group.privacy === "public" || isMember;

  let pendingCount = 0;
  if (isAdmin) {
    const { count } = await supabase
      .from("group_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_id", group.id)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  const { posts, nextCursor } = canSeePosts
    ? await getPosts({ groupId: group.id, before })
    : { posts: [], nextCursor: null };

  const PrivacyIcon = group.privacy === "private" ? Lock : Globe;

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
      {/* Gruppens hoved */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
        <div className="bg-deep-900 px-5 pb-5 pt-6 text-mist-50">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lure-400 text-2xl font-bold text-deep-950">
              {group.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight sm:text-2xl">{group.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-reed-300">
                <span className="flex items-center gap-1">
                  <PrivacyIcon className="h-3.5 w-3.5" aria-hidden />
                  {group.privacy === "private" ? "Privat gruppe" : "Offentlig gruppe"}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {group.member_count} {group.member_count === 1 ? "medlem" : "medlemmer"}
                </span>
                {group.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {group.city}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {group.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-deep-900">{group.description}</p>
          )}

          <JoinPanel
            groupId={group.id}
            userId={me.id}
            status={status}
            isAdmin={isAdmin}
            rules={(rules ?? []) as { id: string; title: string; body: string | null }[]}
          />

          {isAdmin && (
            <Link
              href={`/g/${group.slug}/admin`}
              className="flex items-center justify-between gap-2 rounded-xl bg-mist-50 px-4 py-3 text-sm font-semibold text-deep-900 hover:bg-mist-100"
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" aria-hidden />
                Administrer gruppen
              </span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-lure-400 px-2 py-0.5 text-xs font-bold text-deep-950">
                  {pendingCount} {pendingCount === 1 ? "anmodning" : "anmodninger"}
                </span>
              )}
            </Link>
          )}

          {/* Regler (vises for medlemmer og når man ikke er ved at anmode) */}
          {(rules ?? []).length > 0 && (
            <details className="group rounded-xl bg-mist-50">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-deep-900 [&::-webkit-details-marker]:hidden">
                <ScrollText className="h-4 w-4" aria-hidden />
                Gruppens regler ({(rules ?? []).length})
                <span className="ml-auto text-deep-700 transition group-open:rotate-180" aria-hidden>
                  ▾
                </span>
              </summary>
              <ol className="space-y-2 px-4 pb-4">
                {(rules ?? []).map((r, i) => (
                  <li key={r.id} className="flex gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-deep-900 text-[11px] font-bold text-lure-400">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-semibold text-deep-950">{r.title}</span>
                      {r.body && <span className="block text-deep-700">{r.body}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      </section>

      {/* Skriv i gruppen */}
      {isMember && !before && (
        <Link
          href={`/post/ny?gruppe=${group.slug}`}
          className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100 transition hover:ring-deep-700/30"
        >
          <span className="flex-1 rounded-full bg-mist-100 px-4 py-2.5 text-deep-700">Skriv noget i gruppen...</span>
          <ImagePlus className="h-6 w-6 text-reed-500" aria-hidden />
        </Link>
      )}

      {/* Opslag */}
      {!canSeePosts ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-mist-100">
          <Lock className="mx-auto h-10 w-10 text-reed-500" aria-hidden />
          <p className="mt-3 font-semibold text-deep-900">Dette er en privat gruppe</p>
          <p className="mt-1 text-sm text-deep-700">Bliv medlem for at se og skrive opslag.</p>
        </div>
      ) : posts.length === 0 && !before ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-deep-700 shadow-sm ring-1 ring-mist-100">
          Der er ingen opslag i gruppen endnu.{isMember && " Skriv det første."}
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}

      {nextCursor && (
        <div className="flex justify-center pt-2">
          <Link
            href={`/g/${group.slug}?foer=${encodeURIComponent(nextCursor)}`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-deep-900 shadow-sm ring-1 ring-mist-100 hover:bg-mist-50"
          >
            Vis ældre opslag
          </Link>
        </div>
      )}
    </main>
  );
}
