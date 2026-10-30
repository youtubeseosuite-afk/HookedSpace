// src/lib/blocks.ts
// NY FIL. Bloker og fjern blokering (bruges i browseren). Når man blokerer nogen, forsvinder
// I fra hinandens feed, kommentarer og følgere. Den blokerede får ikke besked.

import { createClient } from "@/lib/supabase/client";

export async function blockUser(blockedId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const me = data.user?.id;
  if (!me) return "Du er ikke logget ind.";
  if (me === blockedId) return "Du kan ikke blokere dig selv.";
  const { error } = await supabase.from("blocks").insert({ blocker_id: me, blocked_id: blockedId });
  if (error && error.code !== "23505") return "Blokeringen kunne ikke gemmes. Prøv igen.";
  return null;
}

export async function unblockUser(blockedId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const me = data.user?.id;
  if (!me) return "Du er ikke logget ind.";
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", blockedId);
  if (error) return "Blokeringen kunne ikke fjernes. Prøv igen.";
  return null;
}
