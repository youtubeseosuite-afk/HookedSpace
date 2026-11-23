// src/app/(app)/auktioner/[id]/rate-deal.tsx
// NY FIL. Bedøm handlen (👍 / 👎 og en kort kommentar), når en auktion er solgt.
// Kun sælger og vinder kan bedømme, én gang hver. En 👍 giver den anden +3 Flex.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Given = { positive: boolean; comment: string | null } | null;

export default function RateDeal({
  auctionId,
  meId,
  otherName,
  myRating,
  theirRating,
}: {
  auctionId: string;
  meId: string;
  otherName: string;
  myRating: Given;
  theirRating: Given;
}) {
  const router = useRouter();
  const [positive, setPositive] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (positive === null) {
      setError("Vælg 👍 eller 👎.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: insErr } = await supabase.from("auction_ratings").insert({
      auction_id: auctionId,
      rater_id: meId,
      ratee_id: meId, // erstattes af databasen med den anden part
      positive,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (insErr) {
      setError(insErr.code === "23505" ? "Du har allerede bedømt handlen." : "Bedømmelsen kunne ikke gemmes. Prøv igen.");
      return;
    }
    router.refresh();
  }

  const Shown = ({ r, label }: { r: NonNullable<Given>; label: string }) => (
    <p className="flex items-start gap-2 text-sm text-deep-900">
      {r.positive ? (
        <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-reed-500" aria-hidden />
      ) : (
        <ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
      )}
      <span>
        {label}
        {r.comment && <span className="text-deep-700"> “{r.comment}”</span>}
      </span>
    </p>
  );

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
      <h2 className="font-semibold text-deep-900">Bedøm handlen</h2>

      {myRating ? (
        <Shown r={myRating} label={`Du gav ${otherName} ${myRating.positive ? "en 👍" : "en 👎"}.`} />
      ) : (
        <>
          <p className="text-sm text-deep-700">
            Gik handlen godt med {otherName}? Din bedømmelse vises på {otherName}s profil. Gør det først, når I har handlet.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPositive(true)}
              aria-pressed={positive === true}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold ring-1 ${
                positive === true ? "bg-reed-500 text-white ring-reed-500" : "text-deep-900 ring-mist-100 hover:bg-mist-50"
              }`}
            >
              <ThumbsUp className="h-4 w-4" aria-hidden /> God handel
            </button>
            <button
              type="button"
              onClick={() => setPositive(false)}
              aria-pressed={positive === false}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold ring-1 ${
                positive === false ? "bg-red-600 text-white ring-red-600" : "text-deep-900 ring-mist-100 hover:bg-mist-50"
              }`}
            >
              <ThumbsDown className="h-4 w-4" aria-hidden /> Dårlig handel
            </button>
          </div>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
            placeholder="Kort kommentar (valgfri)"
            className="w-full rounded-lg border border-mist-100 px-3 py-2 text-sm outline-none focus:border-deep-700"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-deep-900 px-4 py-2.5 text-sm font-semibold text-mist-50 hover:bg-deep-800 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Gem bedømmelse
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </>
      )}

      {theirRating && <Shown r={theirRating} label={`${otherName} gav dig ${theirRating.positive ? "en 👍" : "en 👎"}.`} />}
    </section>
  );
}
