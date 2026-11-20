// src/app/(app)/auktioner/[id]/bid-panel.tsx
// NY FIL. Byd og Køb nu på en auktion. Buddet bekræftes, før det sendes, og er bindende.
// Gæster får boksen "Opret profil". Reglerne (mindste bud, egen auktion, forlængelse) håndhæves i databasen.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel, Loader2, ShoppingBag, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { openJoinPrompt } from "@/components/join-prompt";

type Result = { ok: boolean; message: string };

export default function BidPanel({
  auctionId,
  loggedIn,
  minBid,
  minIncrement,
  buyNowPrice,
  isHighBidder,
}: {
  auctionId: string;
  loggedIn: boolean;
  minBid: number;
  minIncrement: number;
  buyNowPrice: number | null; // null hvis Køb nu ikke (længere) er muligt
  isHighBidder: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(minBid));
  const [confirming, setConfirming] = useState<null | "bid" | "buy">(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Når prisen ændrer sig (nye bud), opdateres forslaget
  useEffect(() => {
    setAmount((cur) => (Number(cur) < minBid ? String(minBid) : cur));
  }, [minBid]);

  const value = Math.round(Number(amount.replace(/\./g, "").replace(",", ".")));
  const valid = Number.isFinite(value) && value >= minBid;
  const isBuyNowAmount = buyNowPrice != null && valid && value >= buyNowPrice;

  function start(kind: "bid" | "buy") {
    if (!loggedIn) {
      openJoinPrompt(kind === "buy" ? "Opret en profil for at købe" : "Opret en profil for at byde");
      return;
    }
    setResult(null);
    if (kind === "bid" && !valid) {
      setResult({ ok: false, message: `Buddet skal være mindst ${minBid.toLocaleString("da-DK")} kr.` });
      return;
    }
    setConfirming(kind === "bid" && isBuyNowAmount ? "buy" : kind);
  }

  async function submit() {
    if (!confirming) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("place_bid", {
      p_auction: auctionId,
      p_amount: confirming === "buy" ? buyNowPrice ?? 0 : value,
      p_buy_now: confirming === "buy",
    });
    setBusy(false);
    setConfirming(null);
    if (error || !data) {
      setResult({ ok: false, message: "Buddet kunne ikke sendes. Prøv igen." });
      return;
    }
    setResult(data as Result);
    router.refresh();
  }

  const shownAmount = confirming === "buy" ? buyNowPrice ?? 0 : value;

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
      {isHighBidder && (
        <p className="flex items-center gap-2 rounded-lg bg-reed-300/40 px-3 py-2 text-sm font-semibold text-deep-950">
          <Check className="h-4 w-4" aria-hidden /> Du har det højeste bud
        </p>
      )}

      {confirming ? (
        <div className="space-y-3">
          <p className="text-sm text-deep-900">
            {confirming === "buy" ? (
              <>
                Køb grejet nu for <b>{shownAmount.toLocaleString("da-DK")} kr.</b>? Auktionen slutter med det samme, og du forpligter dig
                til at købe.
              </>
            ) : (
              <>
                Byd <b>{shownAmount.toLocaleString("da-DK")} kr.</b>? Buddet er bindende. Vinder du, forpligter du dig til at købe.
              </>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-lure-400 px-4 py-2.5 text-sm font-bold text-deep-950 hover:bg-lure-500 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirming === "buy" ? "Ja, køb nu" : "Ja, byd"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={busy}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-deep-800 ring-1 ring-mist-100 hover:bg-mist-50"
            >
              Fortryd
            </button>
          </div>
        </div>
      ) : (
        <>
          {!isHighBidder && (
            <div>
              <label htmlFor="bid" className="mb-1 block text-sm font-medium text-deep-900">
                Dit bud (mindst {minBid.toLocaleString("da-DK")} kr.)
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    id="bid"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-mist-100 bg-white py-2.5 pl-3 pr-10 text-base font-semibold text-deep-950 outline-none focus:border-deep-700"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-deep-700">kr.</span>
                </div>
                <button
                  type="button"
                  onClick={() => start("bid")}
                  className="flex items-center gap-2 rounded-lg bg-deep-900 px-5 py-2.5 text-sm font-bold text-mist-50 hover:bg-deep-800"
                >
                  <Gavel className="h-4 w-4" aria-hidden /> Byd
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[0, 1, 4].map((steps) => {
                  const v = minBid + steps * minIncrement;
                  return (
                    <button
                      key={steps}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      className="rounded-full px-3 py-1 text-xs font-medium text-deep-800 ring-1 ring-mist-100 hover:ring-deep-700"
                    >
                      {v.toLocaleString("da-DK")} kr.
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {buyNowPrice != null && (
            <button
              type="button"
              onClick={() => start("buy")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-lure-400 px-4 py-2.5 text-sm font-bold text-deep-950 hover:bg-lure-500"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden /> Køb nu for {buyNowPrice.toLocaleString("da-DK")} kr.
            </button>
          )}
        </>
      )}

      {result && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-reed-300/40 text-deep-950" : "bg-red-50 text-red-700"}`}
        >
          {result.message}
        </p>
      )}

      <p className="text-xs text-deep-700">
        Et bud i de sidste 2 minutter forlænger auktionen, så alle kan nå at svare.
      </p>
    </div>
  );
}
