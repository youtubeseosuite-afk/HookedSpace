// src/app/admin/auktioner/actions.ts
// NY FIL. Admin: slet en auktion fra GrejAuktionen (med billeder). Bruges både fra auktionsoversigten og rapporterne.

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, requireSiteAdmin } from "@/lib/supabase/admin";
import { removeAuction } from "@/lib/auction-admin";

export type AuctionAdminState = { ok?: string; error?: string };

export async function deleteAuction(_prev: AuctionAdminState, formData: FormData): Promise<AuctionAdminState> {
  const admin = await requireSiteAdmin();
  const auctionId = String(formData.get("auction_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(auctionId)) return { error: "Auktion mangler." };

  const err = await removeAuction(auctionId);
  if (err) return { error: err };

  // Luk åbne rapporter om auktionen
  const db = createAdminClient();
  await db
    .from("reports")
    .update({ status: "resolved", resolution_note: "Auktionen er slettet", resolved_by: admin.id, resolved_at: new Date().toISOString() })
    .eq("target_type", "auction")
    .eq("target_id", auctionId)
    .eq("status", "open");

  revalidatePath("/admin/auktioner");
  revalidatePath("/admin/rapporter");
  revalidatePath("/auktioner");
  return { ok: "Auktionen er slettet." };
}
