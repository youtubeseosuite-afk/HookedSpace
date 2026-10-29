// src/app/admin/bans/unban-button.tsx
// NY FIL. Knap der fjerner en ban direkte fra listen over bortviste.

"use client";

import { useActionState } from "react";
import { unbanUser, type BanState } from "../medlemmer/actions";

export default function UnbanButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<BanState, FormData>(unbanUser, {});
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="user_id" value={userId} />
      <button
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Fjern ban'en? Brugeren kan logge ind igen med det samme.")) e.preventDefault();
        }}
        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-deep-900 ring-1 ring-mist-100 hover:bg-mist-50 disabled:opacity-60"
      >
        {pending ? "Fjerner…" : "Fjern ban"}
      </button>
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
