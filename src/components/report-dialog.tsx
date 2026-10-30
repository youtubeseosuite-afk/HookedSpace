// src/components/report-dialog.tsx
// NY FIL. Vindue hvor man rapporterer et opslag, en kommentar, en profil eller en gruppe.
// Rapporten går til platformens admins (/admin/rapporter). Den der rapporteres, får ikke at vide hvem.

"use client";

import { useEffect, useState } from "react";
import { Flag, Loader2, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ReportTarget = "post" | "comment" | "user" | "group";

const REASONS = [
  { key: "spam", label: "Spam eller reklame" },
  { key: "chikane", label: "Chikane eller mobning" },
  { key: "upassende", label: "Upassende eller stødende" },
  { key: "fredning", label: "Fredningstid eller under mindstemål" },
  { key: "ulovligt", label: "Ulovligt indhold" },
  { key: "andet", label: "Andet" },
] as const;

const TITLE: Record<ReportTarget, string> = {
  post: "Rapportér opslag",
  comment: "Rapportér kommentar",
  user: "Rapportér profil",
  group: "Rapportér gruppe",
};

export default function ReportDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ReportTarget;
  targetId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Luk med Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!reason) {
      setError("Vælg en grund.");
      return;
    }
    if (reason === "andet" && details.trim().length < 3) {
      setError("Skriv kort, hvad der er galt.");
      return;
    }
    setError(null);
    setSending(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setError("Du skal være logget ind for at rapportere.");
      setSending(false);
      return;
    }
    const { error: insErr } = await supabase.from("reports").insert({
      reporter_id: uid,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    setSending(false);
    if (insErr) {
      setError("Rapporten kunne ikke sendes. Prøv igen.");
      return;
    }
    setDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-deep-950/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="report-title" className="flex items-center gap-2 text-lg font-bold text-deep-950">
            <Flag className="h-5 w-5 text-red-600" aria-hidden />
            {TITLE[targetType]}
          </h2>
          <button type="button" onClick={onClose} aria-label="Luk" className="rounded-full p-1.5 text-deep-700 hover:bg-mist-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-reed-300/50 text-deep-900">
              <Check className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-deep-900">
              Tak. Rapporten er sendt til os, og vi kigger på den. Den, du har rapporteret, får ikke at vide, at det var dig.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-deep-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-deep-800"
            >
              Luk
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <fieldset className="space-y-1.5">
              <legend className="mb-1 text-sm text-deep-700">Hvad er problemet?</legend>
              {REASONS.map((r) => (
                <label
                  key={r.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ring-1 ${
                    reason === r.key ? "bg-deep-900 text-white ring-deep-900" : "text-deep-950 ring-mist-100 hover:bg-mist-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.key}
                    checked={reason === r.key}
                    onChange={() => setReason(r.key)}
                    className="sr-only"
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <label className="block">
              <span className="mb-1 block text-sm text-deep-700">Uddyb (valgfrit)</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                rows={3}
                className="w-full rounded-lg border border-mist-100 px-3 py-2 text-sm outline-none focus:border-deep-700"
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              type="button"
              onClick={submit}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Send rapport
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
