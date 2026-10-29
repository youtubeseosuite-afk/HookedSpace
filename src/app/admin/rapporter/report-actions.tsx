// src/app/admin/rapporter/report-actions.tsx
// NY FIL. Knapper på en rapport: Løst, Afvis, Slet indhold, Bortvis bruger og Åbn igen. Med valgfri note.

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check, X, Trash2, Ban, RotateCcw } from "lucide-react";
import { setReportStatus, deleteReportedContent, type ReportActionState } from "./actions";

export default function ReportActions({
  reportId,
  status,
  canDelete,
  targetLabel,
  targetUserId,
  targetUserBanned,
}: {
  reportId: string;
  status: "open" | "resolved" | "dismissed";
  canDelete: boolean;
  targetLabel: string; // "opslaget", "kommentaren", "gruppen"
  targetUserId: string | null;
  targetUserBanned: boolean;
}) {
  const [statusState, statusAction, statusPending] = useActionState<ReportActionState, FormData>(setReportStatus, {});
  const [deleteState, deleteAction, deletePending] = useActionState<ReportActionState, FormData>(deleteReportedContent, {});
  const pending = statusPending || deletePending;
  const state = deleteState.ok || deleteState.error ? deleteState : statusState;

  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-60";

  return (
    <form className="space-y-2">
      <input type="hidden" name="report_id" value={reportId} />

      {status === "open" ? (
        <>
          <input
            name="note"
            maxLength={500}
            placeholder="Note (valgfri, kun for admins)"
            className="w-full rounded-lg border border-mist-100 px-3 py-1.5 text-sm outline-none focus:border-deep-700"
          />
          <div className="flex flex-wrap gap-2">
            <button formAction={statusAction} name="status" value="resolved" disabled={pending} className={`${btn} bg-deep-900 text-white hover:bg-deep-800`}>
              <Check className="h-4 w-4" aria-hidden /> Løst
            </button>
            <button formAction={statusAction} name="status" value="dismissed" disabled={pending} className={`${btn} bg-mist-100 text-deep-900 hover:bg-mist-50 ring-1 ring-mist-100`}>
              <X className="h-4 w-4" aria-hidden /> Afvis
            </button>
            {canDelete && (
              <button
                formAction={deleteAction}
                disabled={pending}
                onClick={(e) => {
                  if (!confirm(`Slet ${targetLabel}? Det kan ikke fortrydes.`)) e.preventDefault();
                }}
                className={`${btn} bg-red-600 text-white hover:bg-red-700`}
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Slet {targetLabel}
              </button>
            )}
            {targetUserId && (
              <Link
                href={`/admin/medlemmer/${targetUserId}`}
                className={`${btn} ${targetUserBanned ? "bg-red-100 text-red-800" : "text-red-700 ring-1 ring-red-200 hover:bg-red-50"}`}
              >
                <Ban className="h-4 w-4" aria-hidden /> {targetUserBanned ? "Bortvist" : "Bortvis bruger"}
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button formAction={statusAction} name="status" value="open" disabled={pending} className={`${btn} text-deep-800 ring-1 ring-mist-100 hover:bg-mist-50`}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Åbn igen
          </button>
          {targetUserId && (
            <Link href={`/admin/medlemmer/${targetUserId}`} className={`${btn} text-deep-800 ring-1 ring-mist-100 hover:bg-mist-50`}>
              Se bruger
            </Link>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-sm text-reed-500">{state.ok}</p>}
    </form>
  );
}
