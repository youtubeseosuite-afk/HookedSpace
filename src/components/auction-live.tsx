// src/components/auction-live.tsx
// NY FIL. GrejAuktionen i browseren: nedtælling til auktionen slutter, og live-status (pris, antal bud,
// sluttid) på auktionssiden. Status hentes igen hvert 10. sekund, så man ser nye bud uden at genindlæse.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function countdownText(endsAt: string, now: number) {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Slut";
  const { d, h, m, s } = parts(ms);
  if (d > 0) return `${d} d ${h} t`;
  if (h > 0) return `${h} t ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

// Lille nedtælling (bruges på kortene i oversigten)
export function Countdown({ endsAt, className = "" }: { endsAt: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const ms = new Date(endsAt).getTime() - Date.now();
    // Tæl hvert sekund den sidste time, ellers hvert halve minut
    const t = setInterval(() => setNow(Date.now()), ms < 3_600_000 ? 1000 : 30_000);
    return () => clearInterval(t);
  }, [endsAt]);

  const soon = now !== null && new Date(endsAt).getTime() - now < 3_600_000;
  return (
    <span className={`${soon ? "font-semibold text-red-700" : ""} ${className}`} suppressHydrationWarning>
      {now === null ? "…" : countdownText(endsAt, now)}
    </span>
  );
}

export type LiveAuction = {
  id: string;
  current_price: number | null;
  start_price: number;
  bid_count: number;
  ends_at: string;
  status: "active" | "sold" | "unsold";
  final_price: number | null;
  buy_now_price: number | null;
};

// Henter status igen med jævne mellemrum, og genindlæser siden når der er nye bud eller auktionen slutter
export function useLiveAuction(initial: LiveAuction) {
  const router = useRouter();
  const [a, setA] = useState(initial);

  useEffect(() => setA(initial), [initial]);

  useEffect(() => {
    if (initial.status !== "active") return;
    const supabase = createClient();
    let stopped = false;
    const t = setInterval(async () => {
      if (document.hidden) return;
      const { data } = await supabase
        .from("auctions")
        .select("id, current_price, start_price, bid_count, ends_at, status, final_price, buy_now_price")
        .eq("id", initial.id)
        .maybeSingle();
      if (stopped || !data) return;
      setA((cur) => {
        if (data.bid_count !== cur.bid_count || data.status !== cur.status) router.refresh();
        return data as LiveAuction;
      });
    }, 10_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [initial.id, initial.status, router]);

  return a;
}

// Prisboksen på auktionssiden
export function LivePrice({ auction }: { auction: LiveAuction }) {
  const a = useLiveAuction(auction);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ended = a.status !== "active" || (now !== null && new Date(a.ends_at).getTime() <= now);
  const price = a.status === "sold" ? a.final_price : a.current_price;

  return (
    <div className="rounded-xl bg-deep-900 p-4 text-mist-50">
      <p className="text-xs uppercase tracking-wide text-reed-300">
        {a.status === "sold" ? "Solgt for" : ended ? (a.bid_count > 0 ? "Højeste bud" : "Ingen bud") : a.current_price == null ? "Startpris" : "Højeste bud"}
      </p>
      <p className="text-3xl font-bold tabular-nums">
        {(price ?? a.start_price).toLocaleString("da-DK")} <span className="text-lg font-semibold">kr.</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-reed-300">
          {a.bid_count} {a.bid_count === 1 ? "bud" : "bud"}
        </span>
        <span suppressHydrationWarning className={ended ? "font-semibold text-lure-400" : ""}>
          {ended
            ? a.status === "sold"
              ? "Auktionen er slut"
              : a.status === "unsold"
                ? "Sluttede uden bud"
                : "Auktionen er slut"
            : now === null
              ? "…"
              : `Slutter om ${countdownText(a.ends_at, now)}`}
        </span>
      </div>
      {!ended && a.buy_now_price != null && (a.current_price ?? 0) < a.buy_now_price && (
        <p className="mt-2 text-sm text-lure-400">Køb nu: {a.buy_now_price.toLocaleString("da-DK")} kr.</p>
      )}
    </div>
  );
}
