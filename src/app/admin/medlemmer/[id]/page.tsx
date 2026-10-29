// src/app/admin/medlemmer/[id]/page.tsx
// NY FIL. Admin: ét medlem. Profil, email og login, aktivitet (30 dage), seneste opslag og kommentarer,
// grupper, rapporter om og fra brugeren, og ban-panelet.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Image as ImageIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { regionLabel } from "@/lib/regions";
import {
  REPORT_REASON_LABEL,
  REPORT_STATUS_LABEL,
  REPORT_TARGET_LABEL,
  banText,
  dkDate,
  dkDateTime,
  sinceText,
} from "../../format";
import BanPanel from "./ban-panel";

export const metadata: Metadata = { title: "Medlem" };

const LEVEL_LABEL: Record<string, string> = {
  begynder: "Begynder",
  oevet: "Øvet",
  erfaren: "Erfaren",
  ekspert: "Ekspert",
};

const VISIBILITY_LABEL: Record<string, string> = {
  public: "Offentlig",
  followers: "Følgere",
  private: "Privat",
};

type Params = { id: string };

const UUID = /^[0-9a-f-]{36}$/i;

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
      <h2 className="mb-2 font-semibold text-deep-900">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminMemberPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const db = createAdminClient();
  const { data: m } = await db.from("admin_member_stats").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();

  const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [profile, posts, comments, groups, reportsAbout, reportsBy, following, ban, act30Posts, act30Comments] =
    await Promise.all([
      db.from("profiles").select("bio, experience_level, onboarded").eq("id", id).maybeSingle(),
      db
        .from("posts")
        .select("id, body, visibility, created_at, is_share, species:species(name), images:post_images(count)")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      db
        .from("post_comments")
        .select("id, body, created_at, post_id")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      db
        .from("group_members")
        .select("role, status, group:groups(name, slug)")
        .eq("user_id", id)
        .limit(50),
      db
        .from("reports")
        .select("id, target_type, reason, details, status, created_at")
        .eq("target_user_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("reports")
        .select("id, target_type, reason, status, created_at", { count: "exact" })
        .eq("reporter_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
      db.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", id),
      db.from("user_bans").select("banned_by").eq("user_id", id).maybeSingle(),
      db.from("posts").select("created_at").eq("user_id", id).gt("created_at", d30).limit(2000),
      db.from("post_comments").select("created_at").eq("user_id", id).gt("created_at", d30).limit(2000),
    ]);

  let bannedByName: string | null = null;
  if (ban.data?.banned_by) {
    const { data } = await db.from("profiles").select("display_name, username").eq("id", ban.data.banned_by).maybeSingle();
    bannedByName = data?.display_name ?? data?.username ?? null;
  }

  // Aktivitet pr. dag (opslag + kommentarer) de sidste 30 dage
  const dayKey = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" });
  const perDay = new Map<string, { p: number; c: number }>();
  for (let i = 29; i >= 0; i--) perDay.set(dayKey(new Date(Date.now() - i * 86_400_000).toISOString()), { p: 0, c: 0 });
  for (const r of act30Posts.data ?? []) {
    const v = perDay.get(dayKey(r.created_at));
    if (v) v.p++;
  }
  for (const r of act30Comments.data ?? []) {
    const v = perDay.get(dayKey(r.created_at));
    if (v) v.c++;
  }
  const days = [...perDay.entries()];
  const maxDay = Math.max(1, ...days.map(([, v]) => v.p + v.c));
  const sum30 = days.reduce((a, [, v]) => a + v.p + v.c, 0);

  const prof = profile.data;
  const name = m.display_name ?? "Uden navn";

  return (
    <div className="space-y-4">
      <Link href="/admin/medlemmer" className="inline-flex items-center gap-1 text-sm font-medium text-deep-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Alle medlemmer
      </Link>

      {/* Hoved */}
      <section
        className={`flex flex-wrap items-center gap-4 rounded-2xl p-4 shadow-sm ring-1 ${
          m.is_banned ? "bg-red-50 ring-red-200" : "bg-white ring-mist-100"
        }`}
      >
        {m.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mist-100 text-2xl font-bold text-deep-800">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-deep-950">
            {name}
            {m.is_admin && <span className="rounded bg-deep-900 px-2 py-0.5 text-xs font-semibold text-white">Admin</span>}
            {m.is_banned && (
              <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Bortvist {banText(m.banned_until)}</span>
            )}
          </h1>
          <p className="text-sm text-deep-700">
            {m.username ? `@${m.username}` : "Profilen er ikke færdig oprettet"} · {m.email ?? "ingen email"} ·{" "}
            {m.provider === "google" ? "Google-login" : "Email-login"}
          </p>
        </div>
        {m.username && (
          <Link
            href={`/u/${m.username}`}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-deep-800 ring-1 ring-mist-100 hover:bg-mist-50"
          >
            Se profil <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Nøgletal */}
          <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              ["Opslag", m.posts],
              ["Kommentarer", m.comments],
              ["Reaktioner", m.reactions],
              ["Følgere", m.followers],
              ["Følger", following.count ?? 0],
              ["Rapporter", m.total_reports],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-mist-100">
                <p className="text-xl font-bold text-deep-950">{value as number}</p>
                <p className="text-xs text-deep-700">{label as string}</p>
              </div>
            ))}
          </section>

          <Box title={`Aktivitet de sidste 30 dage (${sum30})`}>
            <div className="flex h-24 items-end gap-0.5" role="img" aria-label="Opslag og kommentarer pr. dag">
              {days.map(([day, v]) => {
                const total = v.p + v.c;
                return (
                  <div key={day} className="flex h-full flex-1 flex-col justify-end" title={`${day}: ${v.p} opslag, ${v.c} kommentarer`}>
                    {total === 0 ? (
                      <div className="h-0.5 w-full rounded bg-mist-100" />
                    ) : (
                      <>
                        <div className="w-full rounded-t bg-reed-500" style={{ height: `${(v.c / maxDay) * 100}%` }} />
                        <div className="w-full bg-deep-700" style={{ height: `${(v.p / maxDay) * 100}%` }} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-deep-700">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-deep-700" /> Opslag
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-reed-500" /> Kommentarer
              </span>
            </div>
          </Box>

          <Box title="Seneste opslag">
            {(posts.data ?? []).length === 0 ? (
              <p className="text-sm text-deep-700">Ingen opslag.</p>
            ) : (
              <ul className="divide-y divide-mist-100">
                {(posts.data ?? []).map((p) => {
                  const imgCount = (p.images as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
                  const species = (p.species as unknown as { name: string } | null)?.name;
                  return (
                    <li key={p.id} className="py-2 text-sm">
                      <div className="flex items-center justify-between gap-2 text-xs text-deep-700">
                        <span>
                          {dkDateTime(p.created_at)} · {VISIBILITY_LABEL[p.visibility] ?? p.visibility}
                          {p.is_share ? " · Deling" : ""}
                          {species ? ` · ${species}` : ""}
                        </span>
                        <span className="flex items-center gap-2">
                          {imgCount > 0 && (
                            <span className="flex items-center gap-0.5">
                              <ImageIcon className="h-3.5 w-3.5" aria-hidden /> {imgCount}
                            </span>
                          )}
                          <Link href={`/p/${p.id}`} className="font-medium text-deep-800 hover:underline">
                            Åbn
                          </Link>
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-deep-950">{p.body || <em className="text-deep-700">Uden tekst</em>}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Box>

          <Box title="Seneste kommentarer">
            {(comments.data ?? []).length === 0 ? (
              <p className="text-sm text-deep-700">Ingen kommentarer.</p>
            ) : (
              <ul className="divide-y divide-mist-100">
                {(comments.data ?? []).map((c) => (
                  <li key={c.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between gap-2 text-xs text-deep-700">
                      <span>{dkDateTime(c.created_at)}</span>
                      <Link href={`/p/${c.post_id}`} className="font-medium text-deep-800 hover:underline">
                        Se opslag
                      </Link>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-deep-950">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Box>
        </div>

        <div className="space-y-4">
          <BanPanel
            userId={m.id}
            isBanned={m.is_banned}
            isAdmin={m.is_admin}
            bannedAt={m.banned_at}
            bannedUntil={m.banned_until}
            reason={m.ban_reason}
            bannedByName={bannedByName}
          />

          <Box title="Oplysninger">
            <dl className="space-y-1.5 text-sm">
              {[
                ["Oprettet", dkDateTime(m.created_at)],
                ["Sidste login", m.last_sign_in_at ? `${dkDateTime(m.last_sign_in_at)} (${sinceText(m.last_sign_in_at)})` : "aldrig"],
                ["Sidste opslag", sinceText(m.last_post_at)],
                ["Sidste kommentar", sinceText(m.last_comment_at)],
                ["By", m.city ?? "–"],
                ["Landsdel", regionLabel(m.region) ?? "–"],
                ["Erfaring", prof?.experience_level ? LEVEL_LABEL[prof.experience_level] ?? prof.experience_level : "–"],
                ["Profil færdig", prof?.onboarded ? "Ja" : "Nej"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-deep-700">{k}</dt>
                  <dd className="text-right text-deep-950">{v}</dd>
                </div>
              ))}
            </dl>
            {prof?.bio && <p className="mt-3 whitespace-pre-line border-t border-mist-100 pt-3 text-sm text-deep-950">{prof.bio}</p>}
            <p className="mt-3 break-all border-t border-mist-100 pt-3 text-xs text-deep-700">ID: {m.id}</p>
          </Box>

          <Box title={`Rapporter om brugeren (${m.total_reports})`}>
            {(reportsAbout.data ?? []).length === 0 ? (
              <p className="text-sm text-deep-700">Ingen.</p>
            ) : (
              <ul className="divide-y divide-mist-100">
                {(reportsAbout.data ?? []).map((r) => (
                  <li key={r.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className={r.status === "open" ? "font-semibold text-red-700" : "text-deep-950"}>
                        {REPORT_REASON_LABEL[r.reason] ?? r.reason}
                        <span className="font-normal text-deep-700"> · {REPORT_TARGET_LABEL[r.target_type]}</span>
                      </span>
                      <span className="text-xs text-deep-700">{REPORT_STATUS_LABEL[r.status]}</span>
                    </div>
                    {r.details && <p className="line-clamp-2 text-xs text-deep-800">{r.details}</p>}
                    <p className="text-xs text-deep-700">{dkDate(r.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/rapporter" className="mt-2 inline-block text-sm font-medium text-deep-700 hover:underline">
              Gå til rapporter
            </Link>
          </Box>

          <Box title={`Har selv rapporteret (${reportsBy.count ?? 0})`}>
            {(reportsBy.data ?? []).length === 0 ? (
              <p className="text-sm text-deep-700">Ingen.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(reportsBy.data ?? []).map((r) => (
                  <li key={r.id} className="flex justify-between gap-2">
                    <span>
                      {REPORT_REASON_LABEL[r.reason] ?? r.reason}
                      <span className="text-deep-700"> · {REPORT_TARGET_LABEL[r.target_type]}</span>
                    </span>
                    <span className="text-xs text-deep-700">{dkDate(r.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Box>

          <Box title="Grupper">
            {(groups.data ?? []).length === 0 ? (
              <p className="text-sm text-deep-700">Ingen grupper.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(groups.data ?? []).map((g, i) => {
                  const grp = g.group as unknown as { name: string; slug: string } | null;
                  if (!grp) return null;
                  return (
                    <li key={grp.slug + i} className="flex justify-between gap-2">
                      <Link href={`/g/${grp.slug}`} className="truncate text-deep-950 hover:underline">
                        {grp.name}
                      </Link>
                      <span className="shrink-0 text-xs text-deep-700">
                        {g.status === "pending" ? "Anmodet" : g.role === "admin" ? "Gruppe-admin" : "Medlem"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Box>
        </div>
      </div>
    </div>
  );
}
