// src/lib/auction-admin.ts
// NY FIL. Kun til admin på serveren: sletter en auktion med billeder. Kaldes fra admin-actions,
// som selv tjekker, at man er admin. (Ligger her og ikke i en "use server"-fil, så den ikke kan kaldes udefra.)

import { createAdminClient } from "@/lib/supabase/admin";

// Sletter auktionen, dens billeder i lageret og (via databasen) bud, beskeder og bedømmelser
export async function removeAuction(auctionId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data: imgs } = await db.from("auction_images").select("storage_path").eq("auction_id", auctionId);
  const paths = (imgs ?? []).map((i) => i.storage_path);
  if (paths.length) {
    const { error: rmErr } = await db.storage.from("auction-images").remove(paths);
    if (rmErr) return "Billederne kunne ikke slettes. Prøv igen.";
  }
  const { error } = await db.from("auctions").delete().eq("id", auctionId);
  if (error) return "Auktionen kunne ikke slettes.";
  return null;
}
