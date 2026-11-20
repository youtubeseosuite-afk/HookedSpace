// src/app/(app)/auktioner/[id]/cancel-button.tsx
// NY FIL. Sælgeren kan trække sin auktion tilbage, så længe ingen har budt. Billederne slettes også.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CancelAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm("Træk auktionen tilbage? Den bliver slettet med billeder.")) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: imgs } = await supabase.from("auction_images").select("storage_path").eq("auction_id", auctionId);
    const { data: ok } = await supabase.rpc("cancel_auction", { p_auction: auctionId });
    if (!ok) {
      setError("Auktionen kan ikke trækkes tilbage, fordi der allerede er budt.");
      setBusy(false);
      router.refresh();
      return;
    }
    const paths = (imgs ?? []).map((i) => i.storage_path);
    if (paths.length) await supabase.storage.from("auction-images").remove(paths);
    router.push("/auktioner");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="flex items-center gap-1.5 text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" aria-hidden />}
        Træk auktionen tilbage
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
