// src/app/(app)/g/[slug]/join-panel.tsx
// NY FIL. Medlemskab på gruppesiden: anmod om at blive medlem (accepter regler + besked til admin),
// træk anmodning tilbage, eller forlad gruppen.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check, Clock, LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Rule = { id: string; title: string; body: string | null };

export default function JoinPanel({
  groupId,
  userId,
  status,
  isAdmin,
  rules,
}: {
  groupId: string;
  userId: string;
  status: "none" | "pending" | "active";
  isAdmin: boolean;
  rules: Rule[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestJoin() {
    if (!accepted || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
      request_message: message.trim() || null,
      accepted_rules_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      setError("Anmodningen kunne ikke sendes. Prøv igen.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function leave(confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    setBusy(false);
    if (error) {
      setError(
        error.message.includes("mindst én admin")
          ? "Du er den eneste admin. Gør et andet medlem til admin, før du forlader gruppen."
          : "Det lykkedes ikke. Prøv igen."
      );
      return;
    }
    router.refresh();
  }

  // ---------- Medlem ----------
  if (status === "active") {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg bg-reed-300/40 px-3 py-2 text-sm font-semibold text-deep-900">
            <Check className="h-4 w-4" aria-hidden />
            {isAdmin ? "Du er admin" : "Medlem"}
          </span>
          <button
            type="button"
            onClick={() => leave("Vil du forlade gruppen?")}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-deep-700 hover:bg-mist-100 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Forlad gruppe
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  // ---------- Afventer ----------
  if (status === "pending") {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg bg-lure-400/20 px-3 py-2 text-sm font-semibold text-deep-900">
            <Clock className="h-4 w-4" aria-hidden />
            Anmodning sendt. Afventer godkendelse
          </span>
          <button
            type="button"
            onClick={() => leave("Vil du trække din anmodning tilbage?")}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-sm font-medium text-deep-700 hover:bg-mist-100 disabled:opacity-50"
          >
            Træk tilbage
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  // ---------- Ikke medlem ----------
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800"
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        Anmod om medlemskab
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-xl bg-mist-50 p-4">
      <div>
        <h3 className="font-semibold text-deep-950">Gruppens regler</h3>
        {rules.length === 0 ? (
          <p className="mt-1 text-sm text-deep-700">Gruppen har ingen særlige regler. Vær venlig og respektfuld.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {rules.map((r, i) => (
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
        )}
      </div>

      <label className="flex items-start gap-2 text-sm font-medium text-deep-900">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-deep-900"
        />
        Jeg har læst og accepterer gruppens regler
      </label>

      <div>
        <label htmlFor="join-message" className="mb-1 block text-sm font-medium text-deep-900">
          Besked til admin <span className="font-normal text-deep-700">(valgfri)</span>
        </label>
        <textarea
          id="join-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Fortæl kort hvem du er, og hvorfor du vil være med"
          className="w-full resize-y rounded-lg border border-mist-100 bg-white px-3 py-2 text-sm text-deep-950 outline-none focus:border-deep-700"
        />
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={requestJoin}
          disabled={!accepted || busy}
          className="flex items-center gap-2 rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800 disabled:opacity-40"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Send anmodning
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-deep-700 hover:bg-white"
        >
          Annuller
        </button>
      </div>
    </div>
  );
}
