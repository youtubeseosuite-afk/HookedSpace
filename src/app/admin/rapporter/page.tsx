// src/app/admin/rapporter/page.tsx
// NY FIL. Admin: rapporter fra brugerne. Viser det rapporterede indhold (også private opslag med billeder),
// hvem der rapporterede, og hvor mange rapporter indholdet har. Filtrér på status og type.

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Lock, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { postImageUrl } from "@/lib/posts";
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL, REPORT_TARGET_LABEL, dkDateTime } from "../format";
import ReportActions from "./report-actions";

export const metadata: Metadata = { title: "Rapporter" };

const PAGE_SIZE = 30;

const STATUSES = [
  { key: "aabne", label: "Åbne", value: "open" },
  { key: "loeste", label: "Løste", value: "resolved" },
  { key: "afviste", label: "Afviste", value: "dismissed" },
  { key: "alle", label: "Alle", value: null },
] as const;

const TYPES = [
  { key: "alle", label: "Alt", value: null },
  { key: "opslag", label: "Opslag", value: "post" },
  { key: "kommentarer", label: "Kommentarer", value: "comment" },
  { key: "profiler", label: "Profiler", value: "user" },
  { key: "grupper", label: "Grupper", value: "group" },
] as const;

const VISIBILITY_LABEL: Record<string, string> = { public: "Offentlig", followers: "Kun følgere", private: "Privat" };

type Report = {
  id: string;
  reporter_id: string | null;
  target_type: "post" | "comment" | "user" | "group";
  target_id: string;
  target_user_id: string | null;
  reason: string;
  details: string | null;
  status: "open" | "resolved" | "dismissed";
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

type Person = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; bio?: string | null };
type PostT = {
  id: string;
  body: string | null;
  visibility: string;
  location_name: string | null;
  created_at: string;
  is_share: boolean;
  group: { name: string; slug: string } | null;
  post_images: { storage_path: string; position: number }[] | null;
};
type CommentT = { id: string; body: string; created_at: string; post_id: string; post: { body: string | null } | null };
type GroupT = { id: string; name: string; slug: string; description: string | null; privacy: string; member_count: number };

type SP = { status?: string; type?: string; side?: string };

function buildHref(base: SP, patch: Partial<SP>) {
  const m = { ...base, ...patch };
  const p = new URLSearchParams();
  if (m.status && m.status !== "aabne") p.set("status", m.status);
  if (m.type && m.type !== "alle") p.set("type", m.type);
  if (m.side && m.side !== "1") p.set("side", m.side);
  const s = p.toString();
  return `/admin/rapporter${s ? `?${s}` : ""}`;
}

function name(p: Person | undefined | null) {
  if (!p) return "Slettet bruger";
  return p.display_name ?? p.username ?? "Uden navn";
}

function PersonLink({ p, id }: { p: Person | undefined; id: string | null }) {
  if (!id) return <span className="text-deep-700">Slettet bruger</span>;
  return (
    <Link href={`/admin/medlemmer/${id}`} className="font-semibold text-deep-950 hover:underline">
      {name(p)}
      {p?.username && <span className="font-normal text-deep-700"> @{p.username}</span>}
    </Link>
  );
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const statusDef = STATUSES.find((s) => s.key === sp.status) ?? STATUSES[0];
  const typeDef = TYPES.find((t) => t.key === sp.type) ?? TYPES[0];
  const page = Math.max(1, Number.parseInt(sp.side ?? "1", 10) || 1);
  const current: SP = { status: statusDef.key, type: typeDef.key, side: String(page) };

  const db = createAdminClient();

  let q = db
    .from("reports")
    .select(
      "id, reporter_id, target_type, target_id, target_user_id, reason, details, status, resolution_note, resolved_by, resolved_at, created_at",
      { count: "exact" }
    );
  if (statusDef.value) q = q.eq("status", statusDef.value);
  if (typeDef.value) q = q.eq("target_type", typeDef.value);
  // Åbne: ældste først (dem der har ventet længst). Ellers nyeste først.
  q = q.order("created_at", { ascending: statusDef.value === "open" });
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  const reports = (data ?? []) as Report[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Antal åbne pr. fane
  const [openCount] = await Promise.all([db.from("reports").select("id", { count: "exact", head: true }).eq("status", "open")]);

  // Hent alt det rapporterede indhold på én gang
  const idsOf = (t: Report["target_type"]) => [...new Set(reports.filter((r) => r.target_type === t).map((r) => r.target_id))];
  const postIds = idsOf("post");
  const commentIds = idsOf("comment");
  const groupIds = idsOf("group");
  const userTargetIds = idsOf("user");
  const personIds = [
    ...new Set(
      reports.flatMap((r) => [r.reporter_id, r.target_user_id, r.resolved_by]).filter((x): x is string => Boolean(x))
    ),
  ];
  const targetIds = [...new Set(reports.map((r) => r.target_id))];
  const targetUserIds = [...new Set(reports.map((r) => r.target_user_id).filter((x): x is string => Boolean(x)))];

  const empty = { data: [] as never[] };
  const [postsRes, commentsRes, groupsRes, peopleRes, bansRes, siblingsRes] = await Promise.all([
    postIds.length
      ? db
          .from("posts")
          .select("id, body, visibility, location_name, created_at, is_share, group:groups!posts_group_id_fkey ( name, slug ), post_images ( storage_path, position )")
          .in("id", postIds)
      : empty,
    commentIds.length
      ? db.from("post_comments").select("id, body, created_at, post_id, post:posts ( body )").in("id", commentIds)
      : empty,
    groupIds.length ? db.from("groups").select("id, name, slug, description, privacy, member_count").in("id", groupIds) : empty,
    personIds.length || userTargetIds.length
      ? db.from("profiles").select("id, username, display_name, avatar_url, bio").in("id", [...new Set([...personIds, ...userTargetIds])])
      : empty,
    targetUserIds.length
      ? db.from("user_bans").select("user_id, banned_until").in("user_id", targetUserIds)
      : empty,
    targetIds.length ? db.from("reports").select("target_id, status").in("target_id", targetIds) : empty,
  ]);

  const posts = new Map(((postsRes.data ?? []) as unknown as PostT[]).map((p) => [p.id, p]));
  const comments = new Map(((commentsRes.data ?? []) as unknown as CommentT[]).map((c) => [c.id, c]));
  const groups = new Map(((groupsRes.data ?? []) as GroupT[]).map((g) => [g.id, g]));
  const people = new Map(((peopleRes.data ?? []) as Person[]).map((p) => [p.id, p]));
  const now = Date.now();
  const banned = new Set(
    ((bansRes.data ?? []) as { user_id: string; banned_until: string | null }[])
      .filter((b) => !b.banned_until || new Date(b.banned_until).getTime() > now)
      .map((b) => b.user_id)
  );
  const totalByTarget = new Map<string, number>();
  for (const r of (siblingsRes.data ?? []) as { target_id: string }[]) {
    totalByTarget.set(r.target_id, (totalByTarget.get(r.target_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-deep-900">
        Rapporter <span className="text-base font-normal text-deep-700">({count ?? 0})</span>
      </h1>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s.key}
            href={buildHref(current, { status: s.key, side: "1" })}
            className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${
              statusDef.key === s.key ? "bg-deep-900 text-white ring-deep-900" : "bg-white text-deep-800 ring-mist-100 hover:ring-deep-700"
            }`}
          >
            {s.label}
            {s.key === "aabne" && (openCount.count ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-xs text-white">{openCount.count}</span>
            )}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-deep-700">Type:</span>
        {TYPES.map((t) => (
          <Link
            key={t.key}
            href={buildHref(current, { type: t.key, side: "1" })}
            className={typeDef.key === t.key ? "font-semibold text-deep-950 underline" : "text-deep-700 hover:underline"}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Kunne ikke hente rapporter ({error.message})</p>}

      {reports.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-deep-700 shadow-sm ring-1 ring-mist-100">
          {statusDef.value === "open" ? "Ingen åbne rapporter. Godt gået." : "Ingen rapporter her."}
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const post = r.target_type === "post" ? posts.get(r.target_id) : undefined;
            const comment = r.target_type === "comment" ? comments.get(r.target_id) : undefined;
            const group = r.target_type === "group" ? groups.get(r.target_id) : undefined;
            const userTarget = r.target_type === "user" ? people.get(r.target_id) : undefined;
            const exists = Boolean(post || comment || group || userTarget);
            const total = totalByTarget.get(r.target_id) ?? 1;
            const targetLabel = r.target_type === "post" ? "opslaget" : r.target_type === "comment" ? "kommentaren" : "gruppen";
            const images = [...(post?.post_images ?? [])].sort((a, b) => a.position - b.position);

            return (
              <li
                key={r.id}
                className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${r.status === "open" ? "ring-red-200" : "ring-mist-100"}`}
              >
                {/* Hvad og hvem */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-red-700">
                      {REPORT_REASON_LABEL[r.reason] ?? r.reason}
                      <span className="font-normal text-deep-700"> · {REPORT_TARGET_LABEL[r.target_type]}</span>
                      {total > 1 && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          {total} rapporter på dette
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-deep-700">
                      Rapporteret af <PersonLink p={people.get(r.reporter_id ?? "")} id={r.reporter_id} /> · {dkDateTime(r.created_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      r.status === "open" ? "bg-red-600 text-white" : r.status === "resolved" ? "bg-deep-900 text-white" : "bg-mist-100 text-deep-800"
                    }`}
                  >
                    {REPORT_STATUS_LABEL[r.status]}
                  </span>
                </div>

                {r.details && (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-lure-400/15 px-3 py-2 text-sm text-deep-950">“{r.details}”</p>
                )}

                {/* Det rapporterede */}
                <div className="mt-3 rounded-xl bg-mist-50 p-3 ring-1 ring-mist-100">
                  {r.target_type !== "user" && r.target_type !== "group" && (
                    <p className="mb-1 text-xs text-deep-700">
                      Skrevet af <PersonLink p={people.get(r.target_user_id ?? "")} id={r.target_user_id} />
                      {r.target_user_id && banned.has(r.target_user_id) && <span className="ml-1 font-semibold text-red-700">(bortvist)</span>}
                    </p>
                  )}

                  {!exists && <p className="text-sm italic text-deep-700">Indholdet er slettet.</p>}

                  {post && (
                    <div className="space-y-2">
                      <p className="flex flex-wrap items-center gap-2 text-xs text-deep-700">
                        <span>{dkDateTime(post.created_at)}</span>
                        <span className="inline-flex items-center gap-1">
                          {post.visibility !== "public" && <Lock className="h-3 w-3" aria-hidden />}
                          {VISIBILITY_LABEL[post.visibility] ?? post.visibility}
                        </span>
                        {post.group && (
                          <Link href={`/g/${post.group.slug}`} className="inline-flex items-center gap-1 hover:underline">
                            <Users className="h-3 w-3" aria-hidden /> {post.group.name}
                          </Link>
                        )}
                        {post.location_name && <span>📍 {post.location_name}</span>}
                        {post.is_share && <span>Deling</span>}
                      </p>
                      {post.body ? (
                        <p className="whitespace-pre-line text-sm text-deep-950">{post.body}</p>
                      ) : (
                        <p className="text-sm italic text-deep-700">Uden tekst</p>
                      )}
                      {images.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {images.map((img) => (
                            <a key={img.storage_path} href={postImageUrl(img.storage_path)} target="_blank" rel="noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={postImageUrl(img.storage_path)}
                                alt=""
                                loading="lazy"
                                className="h-28 w-28 rounded-lg object-cover ring-1 ring-mist-100 hover:opacity-90"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {comment && (
                    <div className="space-y-1">
                      <p className="text-xs text-deep-700">{dkDateTime(comment.created_at)}</p>
                      <p className="whitespace-pre-line text-sm text-deep-950">{comment.body}</p>
                      {comment.post?.body && (
                        <p className="line-clamp-2 border-l-2 border-mist-100 pl-2 text-xs text-deep-700">
                          Til opslaget: {comment.post.body}
                        </p>
                      )}
                    </div>
                  )}

                  {group && (
                    <div className="space-y-1">
                      <Link href={`/g/${group.slug}`} className="font-semibold text-deep-950 hover:underline">
                        {group.name}
                      </Link>
                      <p className="text-xs text-deep-700">
                        {group.privacy === "private" ? "Privat" : "Offentlig"} gruppe · {group.member_count} medlemmer · oprettet af{" "}
                        <PersonLink p={people.get(r.target_user_id ?? "")} id={r.target_user_id} />
                      </p>
                      {group.description && <p className="line-clamp-3 text-sm text-deep-950">{group.description}</p>}
                    </div>
                  )}

                  {userTarget && (
                    <div className="flex items-center gap-3">
                      {userTarget.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={userTarget.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist-100 font-bold text-deep-800">
                          {name(userTarget).charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <PersonLink p={userTarget} id={userTarget.id} />
                        {banned.has(userTarget.id) && <span className="ml-1 text-xs font-semibold text-red-700">(bortvist)</span>}
                        {userTarget.bio && <p className="line-clamp-2 text-sm text-deep-800">{userTarget.bio}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {r.status !== "open" && (
                  <p className="mt-2 text-xs text-deep-700">
                    {REPORT_STATUS_LABEL[r.status]} af {name(people.get(r.resolved_by ?? ""))} · {dkDateTime(r.resolved_at)}
                    {r.resolution_note && <> · “{r.resolution_note}”</>}
                  </p>
                )}

                <div className="mt-3">
                  <ReportActions
                    reportId={r.id}
                    status={r.status}
                    canDelete={exists && r.target_type !== "user"}
                    targetLabel={targetLabel}
                    targetUserId={r.target_user_id}
                    targetUserBanned={Boolean(r.target_user_id && banned.has(r.target_user_id))}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Sider">
          {page > 1 ? (
            <Link href={buildHref(current, { side: String(page - 1) })} className="flex items-center gap-1 font-medium text-deep-800 hover:underline">
              <ChevronLeft className="h-4 w-4" aria-hidden /> Forrige
            </Link>
          ) : (
            <span />
          )}
          <span className="text-deep-700">
            Side {page} af {pages}
          </span>
          {page < pages ? (
            <Link href={buildHref(current, { side: String(page + 1) })} className="flex items-center gap-1 font-medium text-deep-800 hover:underline">
              Næste <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
