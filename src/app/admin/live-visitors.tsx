// src/app/admin/live-visitors.tsx
// NY FIL. "Lige nu": hvem der er på siden i realtid (Supabase Presence). Medlemmer og gæster,
// hvilke sider de er på, og en liste over medlemmer online. Opdaterer sig selv uden at genindlæse.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PRESENCE_CHANNEL, type PresenceMeta } from "@/lib/presence";
import { resolveOnlineMembers, type OnlineMember } from "./actions";

type Visitor = PresenceMeta & { key: string };

function since(at: number, now: number) {
  const min = Math.max(0, Math.floor((now - at) / 60_000));
  if (min < 1) return "lige nu";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} t ${min % 60} min`;
}

export default function LiveVisitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [connected, setConnected] = useState(false);
  const [names, setNames] = useState<Record<string, OnlineMember>>({});
  const [now, setNow] = useState(() => Date.now());
  const asked = useRef(new Set<string>());

  useEffect(() => {
    // Egen forbindelse, så den ikke kolliderer med den forbindelse, der tæller besøgende
    const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "fiskoman-live" },
    });
    // Admin lytter kun med (tæller ikke selv med)
    const channel = supabase.channel(PRESENCE_CHANNEL, { config: { presence: { key: `admin-${crypto.randomUUID()}` } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMeta>();
        const list: Visitor[] = [];
        for (const [key, metas] of Object.entries(state)) {
          const m = metas[metas.length - 1];
          if (m && typeof m.section === "string") list.push({ key, uid: m.uid ?? null, section: m.section, at: m.at ?? Date.now() });
        }
        setVisitors(list);
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, []);

  // Slå navne op på nye medlemmer
  useEffect(() => {
    const missing = [...new Set(visitors.map((v) => v.uid).filter((u): u is string => !!u))].filter(
      (u) => !asked.current.has(u)
    );
    if (missing.length === 0) return;
    missing.forEach((u) => asked.current.add(u));
    resolveOnlineMembers(missing)
      .then((rows) => setNames((cur) => ({ ...cur, ...Object.fromEntries(rows.map((r) => [r.id, r])) })))
      .catch(() => {});
  }, [visitors]);

  const stats = useMemo(() => {
    const memberIds = new Set(visitors.filter((v) => v.uid).map((v) => v.uid as string));
    const guests = visitors.filter((v) => !v.uid).length;
    const bySection = new Map<string, number>();
    for (const v of visitors) bySection.set(v.section, (bySection.get(v.section) ?? 0) + 1);
    const sections = [...bySection.entries()].sort((a, b) => b[1] - a[1]);
    // Ét medlem kan have flere faner åbne: vis den nyeste
    const members = new Map<string, Visitor>();
    for (const v of visitors) {
      if (!v.uid) continue;
      const cur = members.get(v.uid);
      if (!cur || v.at > cur.at) members.set(v.uid, v);
    }
    return {
      total: memberIds.size + guests,
      members: memberIds.size,
      guests,
      sections,
      memberList: [...members.values()].sort((a, b) => b.at - a.at),
    };
  }, [visitors]);

  const maxSection = Math.max(1, ...stats.sections.map(([, n]) => n));

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-deep-900">
          <span className="relative flex h-2.5 w-2.5">
            {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-reed-500 opacity-60" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${connected ? "bg-reed-500" : "bg-mist-100"}`} />
          </span>
          Lige nu
        </h2>
        <span className="flex items-center gap-1 text-xs text-deep-700">
          <Radio className="h-3.5 w-3.5" aria-hidden /> {connected ? "Live" : "Forbinder…"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-deep-900 p-3 text-mist-50">
          <p className="text-3xl font-bold tabular-nums">{stats.total}</p>
          <p className="text-xs text-reed-300">online</p>
        </div>
        <div className="rounded-xl bg-mist-50 p-3">
          <p className="text-3xl font-bold tabular-nums text-deep-950">{stats.members}</p>
          <p className="text-xs text-deep-700">medlemmer</p>
        </div>
        <div className="rounded-xl bg-mist-50 p-3">
          <p className="text-3xl font-bold tabular-nums text-deep-950">{stats.guests}</p>
          <p className="text-xs text-deep-700">gæster</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-deep-700">Sider</h3>
          {stats.sections.length === 0 ? (
            <p className="text-sm text-deep-700">Ingen besøgende lige nu.</p>
          ) : (
            <ul className="space-y-1.5">
              {stats.sections.map(([section, n]) => (
                <li key={section} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-deep-900">{section}</span>
                    <span className="font-semibold tabular-nums text-deep-950">{n}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-mist-100">
                    <div className="h-full rounded-full bg-deep-700" style={{ width: `${(n / maxSection) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-deep-700">Medlemmer online</h3>
          {stats.memberList.length === 0 ? (
            <p className="text-sm text-deep-700">Ingen medlemmer online.</p>
          ) : (
            <ul className="max-h-64 divide-y divide-mist-100 overflow-y-auto">
              {stats.memberList.map((v) => {
                const m = names[v.uid as string];
                const name = m?.display_name ?? m?.username ?? "Henter…";
                return (
                  <li key={v.uid}>
                    <Link
                      href={`/admin/medlemmer/${v.uid}`}
                      className="flex items-center justify-between gap-2 py-1.5 text-sm hover:bg-mist-50"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-semibold text-deep-950">{name}</span>
                        <span className="text-deep-700"> · {v.section}</span>
                      </span>
                      <span className="shrink-0 text-xs text-deep-700">{since(v.at, now)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-deep-700">
        Tæller alle åbne faner på FiskoMan undtagen admin-siderne. Tiden er, hvor længe de har været på den side.
      </p>
    </section>
  );
}
