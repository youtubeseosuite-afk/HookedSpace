// src/app/admin/bans/page.tsx
// NY FIL. Admin: aktive bortvisninger (med Fjern ban), udløbne bortvisninger,
// og brugernes egne blokeringer: hvem der er blokeret mest, og de seneste blokeringer.

import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Clock, UserX } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { banText, dkDate, dkDateTime, sinceText } from "../format";
import UnbanButton from "./unban-button";

export const metadata: Metadata = { title: "Bans og blokeringer" };

type BanRow = { user_id: string; banned_at: string; banned_until: string | null; reason: string | null; banned_by: string | null };
type BlockRow = { blocker_id: string; blocked_id: string; created_at: string };
type Person = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

function Section({ icon: Icon, title, children }: { icon: typeof Ban; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-deep-900">
        <Icon className="h-4 w-4" aria-hidden /> {title}
      </h2>
      {children}
    </section>
  );
}

export default async function AdminBansPage() {
  const db = createAdminClient();

  const [bansRes, blocksRes, blockTotal] = await Promise.all([
    db.from("user_bans").select("user_id, banned_at, banned_until, reason, banned_by").order("banned_at", { ascending: false }).limit(500),
    db.from("blocks").select("blocker_id, blocked_id, created_at").order("created_at", { ascending: false }).limit(5000),
    db.from("blocks").select("blocker_id", { count: "exact", head: true }),
  ]);

  const now = Date.now();
  const bans = (bansRes.data ?? []) as BanRow[];
  const active = bans.filter((b) => !b.banned_until || new Date(b.banned_until).getTime() > now);
  const expired = bans.filter((b) => b.banned_until && new Date(b.banned_until).getTime() <= now).slice(0, 20);
  const blocks = (blocksRes.data ?? []) as BlockRow[];

  // Mest blokerede brugere (kan pege på nogen, der chikanerer)
  const blockedCount = new Map<string, number>();
  for (const b of blocks) blockedCount.set(b.blocked_id, (blockedCount.get(b.blocked_id) ?? 0) + 1);
  const topBlocked = [...blockedCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const latestBlocks = blocks.slice(0, 30);

  const ids = new Set<string>();
  for (const b of [...active, ...expired]) {
    ids.add(b.user_id);
    if (b.banned_by) ids.add(b.banned_by);
  }
  for (const [id] of topBlocked) ids.add(id);
  for (const b of latestBlocks) {
    ids.add(b.blocker_id);
    ids.add(b.blocked_id);
  }
  const { data: peopleData } = ids.size
    ? await db.from("profiles").select("id, username, display_name, avatar_url").in("id", [...ids])
    : { data: [] };
  const people = new Map(((peopleData ?? []) as Person[]).map((p) => [p.id, p]));

  const nameOf = (id: string | null) => {
    if (!id) return "ukendt";
    const p = people.get(id);
    return p?.display_name ?? p?.username ?? "Slettet bruger";
  };
  const UserLink = ({ id }: { id: string }) => (
    <Link href={`/admin/medlemmer/${id}`} className="font-semibold text-deep-950 hover:underline">
      {nameOf(id)}
      {people.get(id)?.username && <span className="font-normal text-deep-700"> @{people.get(id)?.username}</span>}
    </Link>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-deep-900">Bans og blokeringer</h1>

      <Section icon={Ban} title={`Aktive bortvisninger (${active.length})`}>
        {active.length === 0 ? (
          <p className="text-sm text-deep-700">Ingen er bortvist lige nu.</p>
        ) : (
          <ul className="divide-y divide-mist-100">
            {active.map((b) => (
              <li key={b.user_id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <UserLink id={b.user_id} />
                  <p className="text-sm">
                    <span className="font-semibold text-red-700">{b.banned_until ? `Til ${dkDateTime(b.banned_until)}` : "Permanent"}</span>
                    <span className="text-deep-700">
                      {" "}
                      · bortvist {dkDate(b.banned_at)} af {nameOf(b.banned_by)}
                    </span>
                  </p>
                  {b.reason && <p className="mt-1 line-clamp-2 text-sm text-deep-950">“{b.reason}”</p>}
                </div>
                <UnbanButton userId={b.user_id} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {expired.length > 0 && (
        <Section icon={Clock} title="Udløbne bortvisninger">
          <ul className="divide-y divide-mist-100">
            {expired.map((b) => (
              <li key={b.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <UserLink id={b.user_id} />
                  {b.reason && <span className="text-deep-700"> · “{b.reason}”</span>}
                </span>
                <span className="text-xs text-deep-700">
                  {dkDate(b.banned_at)} – {banText(b.banned_until).replace(/^til /, "")}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={UserX} title="Mest blokerede brugere">
          <p className="mb-2 text-xs text-deep-700">
            Brugerne blokerer selv hinanden. Mange blokeringer af den samme person kan være et tegn på chikane. I alt {blockTotal.count ?? 0}{" "}
            blokeringer.
          </p>
          {topBlocked.length === 0 ? (
            <p className="text-sm text-deep-700">Ingen blokeringer endnu.</p>
          ) : (
            <ul className="divide-y divide-mist-100">
              {topBlocked.map(([id, n]) => (
                <li key={id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <UserLink id={id} />
                  <span className={`shrink-0 font-semibold ${n >= 3 ? "text-red-700" : "text-deep-800"}`}>
                    {n} {n === 1 ? "blokering" : "blokeringer"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={UserX} title="Seneste blokeringer">
          {latestBlocks.length === 0 ? (
            <p className="text-sm text-deep-700">Ingen blokeringer endnu.</p>
          ) : (
            <ul className="divide-y divide-mist-100">
              {latestBlocks.map((b) => (
                <li key={`${b.blocker_id}-${b.blocked_id}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0">
                    <UserLink id={b.blocker_id} /> <span className="text-deep-700">blokerede</span> <UserLink id={b.blocked_id} />
                  </span>
                  <span className="text-xs text-deep-700">{sinceText(b.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
