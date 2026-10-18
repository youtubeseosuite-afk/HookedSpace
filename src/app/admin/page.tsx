// src/app/admin/page.tsx
// NY FIL. Admin-overblik: nøgletal, nye medlemmer pr. dag (14 dage), seneste medlemmer og åbne rapporter.

import type { Metadata } from "next";
import Link from "next/link";
import { Users, FileText, MessageCircle, Flag, Ban, UsersRound, Activity } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Overblik" };

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  chikane: "Chikane",
  ulovligt: "Ulovligt indhold",
  upassende: "Upassende",
  fredning: "Fredningstid / mindstemål",
  andet: "Andet",
};

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function dkDate(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", timeZone: "Europe/Copenhagen" });
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  href,
  alert,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
  alert?: boolean;
}) {
  const body = (
    <div
      className={`h-full rounded-2xl p-4 shadow-sm ring-1 ${alert ? "bg-red-50 ring-red-200" : "bg-white ring-mist-100"} ${
        href ? "transition hover:ring-deep-700/40" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-sm text-deep-700">
        <Icon className={`h-4 w-4 ${alert ? "text-red-600" : ""}`} aria-hidden />
        {label}
      </div>
      <p className={`mt-1 text-3xl font-bold ${alert ? "text-red-700" : "text-deep-950"}`}>{value}</p>
      {sub && <p className="text-xs text-deep-700">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminDashboard() {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const d7 = daysAgo(7);
  const d14 = daysAgo(14);

  const head = { count: "exact" as const, head: true };
  const [
    users,
    users7,
    posts,
    posts7,
    comments7,
    groups,
    openReports,
    activeBans,
    activePosters,
    signups14,
    latestUsers,
    latestReports,
  ] = await Promise.all([
    db.from("profiles").select("id", head),
    db.from("profiles").select("id", head).gt("created_at", d7),
    db.from("posts").select("id", head),
    db.from("posts").select("id", head).gt("created_at", d7),
    db.from("post_comments").select("id", head).gt("created_at", d7),
    db.from("groups").select("id", head),
    db.from("reports").select("id", head).eq("status", "open"),
    db.from("user_bans").select("user_id", head).or(`banned_until.is.null,banned_until.gt.${now}`),
    db.from("posts").select("user_id").gt("created_at", d7).limit(5000),
    db.from("profiles").select("created_at").gt("created_at", d14).limit(5000),
    db.from("profiles").select("id, username, display_name, city, created_at").order("created_at", { ascending: false }).limit(6),
    db
      .from("reports")
      .select("id, target_type, reason, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const activeUsers7 = new Set((activePosters.data ?? []).map((r) => r.user_id)).size;

  // Nye medlemmer pr. dag de seneste 14 dage (dansk tid)
  const dayKey = (iso: string) =>
    new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" }); // ÅÅÅÅ-MM-DD
  const perDay = new Map<string, number>();
  for (let i = 13; i >= 0; i--) perDay.set(dayKey(daysAgo(i)), 0);
  for (const r of signups14.data ?? []) {
    const k = dayKey(r.created_at);
    if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const days = [...perDay.entries()];
  const maxDay = Math.max(1, ...days.map(([, v]) => v));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-deep-900">Overblik</h1>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Medlemmer" value={users.count ?? 0} sub={`+${users7.count ?? 0} de sidste 7 dage`} href="/admin/medlemmer" />
        <Stat icon={Activity} label="Aktive (7 dage)" value={activeUsers7} sub="har postet" />
        <Stat icon={FileText} label="Opslag" value={posts.count ?? 0} sub={`+${posts7.count ?? 0} de sidste 7 dage`} />
        <Stat icon={MessageCircle} label="Kommentarer (7 dage)" value={comments7.count ?? 0} />
        <Stat icon={UsersRound} label="Grupper" value={groups.count ?? 0} />
        <Stat
          icon={Flag}
          label="Åbne rapporter"
          value={openReports.count ?? 0}
          href="/admin/rapporter"
          alert={(openReports.count ?? 0) > 0}
        />
        <Stat icon={Ban} label="Aktive bans" value={activeBans.count ?? 0} href="/admin/bans" />
      </section>

      {/* Nye medlemmer pr. dag */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
        <h2 className="mb-3 font-semibold text-deep-900">Nye medlemmer pr. dag (14 dage)</h2>
        <div className="flex h-32 items-end gap-1" role="img" aria-label="Nye medlemmer pr. dag">
          {days.map(([day, v]) => (
            <div key={day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${day}: ${v}`}>
              <span className="text-[10px] font-semibold text-deep-700">{v > 0 ? v : ""}</span>
              <div
                className="w-full rounded-t bg-deep-700"
                style={{ height: `${Math.max(2, (v / maxDay) * 96)}px`, opacity: v > 0 ? 1 : 0.25 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-deep-700">
          <span>{days[0]?.[0]}</span>
          <span>I dag</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-deep-900">Nyeste medlemmer</h2>
            <Link href="/admin/medlemmer" className="text-sm font-medium text-deep-700 hover:underline">
              Se alle
            </Link>
          </div>
          <ul className="divide-y divide-mist-100">
            {(latestUsers.data ?? []).map((u) => (
              <li key={u.id}>
                <Link href={`/admin/medlemmer/${u.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-mist-50">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-deep-950">{u.display_name ?? "Uden navn"}</span>{" "}
                    <span className="text-deep-700">{u.username ? `@${u.username}` : "(ikke færdig)"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-deep-700">
                    {u.city ? `${u.city} · ` : ""}
                    {dkDate(u.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-deep-900">Åbne rapporter</h2>
            <Link href="/admin/rapporter" className="text-sm font-medium text-deep-700 hover:underline">
              Se alle
            </Link>
          </div>
          {(latestReports.data ?? []).length === 0 ? (
            <p className="py-2 text-sm text-deep-700">Ingen åbne rapporter.</p>
          ) : (
            <ul className="divide-y divide-mist-100">
              {(latestReports.data ?? []).map((r) => (
                <li key={r.id}>
                  <Link href="/admin/rapporter" className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-mist-50">
                    <span>
                      <span className="font-semibold text-red-700">{REASON_LABEL[r.reason] ?? r.reason}</span>{" "}
                      <span className="text-deep-700">· {r.target_type === "post" ? "opslag" : r.target_type === "comment" ? "kommentar" : r.target_type === "user" ? "profil" : "gruppe"}</span>
                    </span>
                    <span className="text-xs text-deep-700">{dkDate(r.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
