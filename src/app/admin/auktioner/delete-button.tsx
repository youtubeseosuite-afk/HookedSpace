// src/app/admin/auktioner/delete-button.tsx
// NY FIL. Knap i admin, der sletter en auktion efter bekræftelse.

"use client";

import { useActionState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteAuction, type AuctionAdminState } from "./actions";

export default function DeleteAuctionButton({ auctionId, title }: { auctionId: string; title: string }) {
  const [state, action, pending] = useActionState<AuctionAdminState, FormData>(deleteAuction, {});
  if (state.ok) return <span className="text-xs font-semibold text-reed-500">Slettet</span>;
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="auction_id" value={auctionId} />
      <button
        disabled={pending}
        onClick={(e) => {
          if (!confirm(`Slet auktionen "${title}"? Bud, beskeder og billeder slettes også.`)) e.preventDefault();
        }}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />} Slet
      </button>
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
