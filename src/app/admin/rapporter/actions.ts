// src/app/admin/rapporter/actions.ts
// NY FIL. Server actions til rapporter: afvis, markér som løst, og slet det rapporterede indhold
// (opslag med billeder, kommentar eller gruppe). Sletning lukker alle åbne rapporter om samme indhold.

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, requireSiteAdmin } from "@/lib/supabase/admin";

export type ReportActionState = { ok?: string; error?: string };

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/admin/rapporter");
  revalidatePath("/admin/medlemmer");
}

function readNote(formData: FormData) {
  return String(formData.get("note") ?? "").trim().slice(0, 500) || null;
}

// Afvis eller løs én rapport (uden at røre indholdet)
export async function setReportStatus(_prev: ReportActionState, formData: FormData): Promise<ReportActionState> {
  const admin = await requireSiteAdmin();
  const reportId = String(formData.get("report_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!reportId) return { error: "Rapport mangler." };
  if (!["resolved", "dismissed", "open"].includes(status)) return { error: "Ugyldig status." };

  const db = createAdminClient();
  const reopening = status === "open";
  const { error } = await db
    .from("reports")
    .update({
      status,
      resolution_note: reopening ? null : readNote(formData),
      resolved_by: reopening ? null : admin.id,
      resolved_at: reopening ? null : new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) return { error: "Rapporten kunne ikke opdateres." };

  refresh();
  return { ok: status === "dismissed" ? "Rapporten er afvist." : status === "resolved" ? "Rapporten er løst." : "Rapporten er åbnet igen." };
}

// Slet det rapporterede indhold og luk alle åbne rapporter om det
export async function deleteReportedContent(_prev: ReportActionState, formData: FormData): Promise<ReportActionState> {
  const admin = await requireSiteAdmin();
  const reportId = String(formData.get("report_id") ?? "");
  if (!reportId) return { error: "Rapport mangler." };

  const db = createAdminClient();
  const { data: report } = await db.from("reports").select("target_type, target_id").eq("id", reportId).maybeSingle();
  if (!report) return { error: "Rapporten findes ikke." };

  const { target_type, target_id } = report;

  if (target_type === "post") {
    // Billeder i Storage først, så de ikke bliver liggende
    const { data: images } = await db.from("post_images").select("storage_path").eq("post_id", target_id);
    const paths = (images ?? []).map((i) => i.storage_path);
    if (paths.length > 0) {
      const { error: rmErr } = await db.storage.from("post-images").remove(paths);
      if (rmErr) return { error: "Billederne kunne ikke slettes. Prøv igen." };
    }
    const { error } = await db.from("posts").delete().eq("id", target_id);
    if (error) return { error: "Opslaget kunne ikke slettes." };
  } else if (target_type === "comment") {
    const { error } = await db.from("post_comments").delete().eq("id", target_id);
    if (error) return { error: "Kommentaren kunne ikke slettes." };
  } else if (target_type === "group") {
    // Gruppens opslag bliver private og bliver liggende hos forfatterne
    const { error } = await db.from("groups").delete().eq("id", target_id);
    if (error) return { error: "Gruppen kunne ikke slettes." };
  } else {
    return { error: "En profil kan ikke slettes herfra. Bortvis brugeren i stedet." };
  }

  const label = target_type === "post" ? "Opslaget" : target_type === "comment" ? "Kommentaren" : "Gruppen";
  await db
    .from("reports")
    .update({
      status: "resolved",
      resolution_note: readNote(formData) ?? `${label} er slettet`,
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("target_type", target_type)
    .eq("target_id", target_id)
    .eq("status", "open");

  refresh();
  return { ok: `${label} er slettet, og rapporterne om det er lukket.` };
}
