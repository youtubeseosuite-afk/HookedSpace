// src/app/admin/actions.ts
// NY FIL. Server actions til admin-overblikket. Slår navne op på medlemmer, der er online lige nu.

"use server";

import { createAdminClient, requireSiteAdmin } from "@/lib/supabase/admin";

export type OnlineMember = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

export async function resolveOnlineMembers(ids: string[]): Promise<OnlineMember[]> {
  await requireSiteAdmin();
  const clean = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 300);
  if (clean.length === 0) return [];
  const db = createAdminClient();
  const { data } = await db.from("profiles").select("id, username, display_name, avatar_url").in("id", clean);
  return (data ?? []) as OnlineMember[];
}
