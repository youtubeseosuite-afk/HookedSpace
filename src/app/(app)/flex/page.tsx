// src/app/(app)/flex/page.tsx
// OPDATERET (ingen døgngrænse, samme stang-ikon). Flex: din egen Flex og niveau, leaderboard (uge, måned, altid; hele landet eller din landsdel),
// og hvordan man får Flex.

import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { regionLabel } from "@/lib/regions";
import { FLEX_LEVELS, FLEX_RULES, flexLevel, formatFlex } from "@/lib/flex";
import FlexMeter from "@/components/flex-meter";
import { FlexIcon } from "@/components/flex-badge";

export const metadata: Metadata = { title: "Flex" };

const PERIODS = [
  { key: "uge", label: "Denne uge", days: 7 },
  { key: "maaned", label: "30 dage", days: 30 },
  { key: "altid", label: "Altid", days: 3650 },
] as const;

type Row = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  region: string | null;
  points: number;
  total_flex: number;
};

type SP = { periode?: string; omraade?: string };

export default async function FlexPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireProfile();
  const sp = await searchParams;
  const period = PERIODS.find((p) => p.key === sp.periode) ?? PERIODS[1];
  const supabase = await createClient();

  const { data: mine } = await supabase.from("profiles").select("flex, region").eq("id", me.id).single();
  const myRegion = mine?.region ?? null;
  const local = sp.omraade === "mit" && Boolean(myRegion);

  const { data } = await supabase.rpc("flex_leaderboard", {
    p_days: period.days,
    p_region: local ? myRegion : null,
    p_limit: 50,
  });
  const rows = (data ?? []) as Row[];
  const myIndex = rows.findIndex((r) => r.user_id === me.id);

  const href = (patch: Partial<SP>) => {
    const m = { periode: period.key, omraade: local ? "mit" : "alle", ...patch };
    const p = new URLSearchParams();
    if (m.periode !== "maaned") p.set("periode", m.periode);
    if (m.omraade === "mit") p.set("omraade", "mit");
    const s = p.toString();
    return `/flex${s ? `?${s}` : ""}`;
  };

  const pill = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm font-medium ring-1 ${
      active ? "bg-deep-900 text-white ring-deep-900" : "bg-white text-deep-800 ring-mist-100 hover:ring-deep-700"
    }`;

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-deep-900">
          <FlexIcon className="h-7 w-7 text-lure-500" /> Flex
        </h1>
        <p className="text-sm text-deep-700">Når stangen bøjer. Du får Flex, når andre lystfiskere kan lide det, du deler.</p>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
        <p className="text-sm font-semibold text-deep-900">Din Flex</p>
        <FlexMeter points={mine?.flex ?? 0} />
        {myIndex >= 0 && (
          <p className="mt-2 text-sm text-deep-700">
            Du er nr. <span className="font-bold text-deep-950">{myIndex + 1}</span> på listen herunder.
          </p>
        )}
      </section>

      {/* Leaderboard */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
        <h2 className="mb-3 font-semibold text-deep-900">Mest Flex</h2>
        <div className="mb-2 flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Link key={p.key} href={href({ periode: p.key })} className={pill(period.key === p.key)}>
              {p.label}
            </Link>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Link href={href({ omraade: "alle" })} className={pill(!local)}>
            Hele landet
          </Link>
          {myRegion ? (
            <Link href={href({ omraade: "mit" })} className={pill(local)}>
              {regionLabel(myRegion)}
            </Link>
          ) : (
            <Link href="/indstillinger" className="px-1 py-1 text-sm text-deep-700 underline">
              Vælg din landsdel for at se den lokale liste
            </Link>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-deep-700">Ingen har fået Flex i den periode endnu.</p>
        ) : (
          <ol className="divide-y divide-mist-100">
            {rows.map((r, i) => {
              const name = r.display_name ?? r.username;
              const lvl = flexLevel(r.total_flex);
              const isMe = r.user_id === me.id;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <li key={r.user_id}>
                  <Link
                    href={`/u/${r.username}`}
                    className={`flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-mist-50 ${isMe ? "bg-lure-400/15" : ""}`}
                  >
                    <span className="w-7 shrink-0 text-center text-sm font-bold text-deep-700 tabular-nums">{medal ?? i + 1}</span>
                    {r.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-reed-500 text-sm font-semibold text-white">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-deep-950">
                        {name} {isMe && <span className="font-normal text-deep-700">(dig)</span>}
                      </span>
                      <span className="block truncate text-xs text-deep-700">
                        {lvl.name}
                        {r.city ? ` · ${r.city}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-deep-950 tabular-nums">
                      <FlexIcon className="h-4 w-4 text-lure-500" />
                      {period.key === "altid" ? formatFlex(r.total_flex) : `+${formatFlex(r.points)}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Sådan får du Flex */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
          <h2 className="mb-2 font-semibold text-deep-900">Sådan får du Flex</h2>
          <ul className="space-y-1.5 text-sm">
            {FLEX_RULES.map((r) => (
              <li key={r.label} className="flex justify-between gap-3">
                <span className="text-deep-800">{r.label}</span>
                <span className="shrink-0 font-bold text-deep-950">+{r.points}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-deep-700">
            Du kan ikke give dig selv Flex. Fjernes en reaktion,
            kommentar eller et opslag, forsvinder Flex&apos;en igen.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
          <h2 className="mb-2 font-semibold text-deep-900">Niveauer</h2>
          <ul className="space-y-1.5 text-sm">
            {FLEX_LEVELS.map((l) => (
              <li key={l.level} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-deep-800">
                  <FlexIcon className="h-5 w-5 text-lure-500" />
                  {l.level}. {l.name}
                </span>
                <span className="shrink-0 text-deep-700 tabular-nums">{l.min.toLocaleString("da-DK")}+</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
