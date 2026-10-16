// src/app/(app)/g/[slug]/admin/requests-list.tsx
// NY FIL. Ventende anmodninger om medlemskab: godkend eller afvis hver enkelt, eller godkend alle på én gang.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, MapPin, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type JoinRequest = {
  user_id: string;
  request_message: string | null;
  requested_at: string;
  profile: { username: string; display_name: string | null; avatar_url: string | null; city: string | null } | null;
};

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min. siden`;
  if (s < 86400) return `${Math.floor(s / 3600)} t. siden`;
  return `${Math.floor(s / 86400)} d. siden`;
}

export default function RequestsList({ groupId, requests }: { groupId: string; requests: JoinRequest[] }) {
  const router = useRouter();
  const [handled, setHandled] = useState<Record<string, "approved" | "declined">>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = requests.filter((r) => !handled[r.user_id]);

  async function approve(userIds: string[]) {
    if (userIds.length === 0) return;
    setBusy(userIds.length > 1 ? "all" : userIds[0]);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("group_members")
      .update({ status: "active" })
      .eq("group_id", groupId)
      .eq("status", "pending")
      .in("user_id", userIds);
    setBusy(null);
    if (error) {
      setError("Det lykkedes ikke. Prøv igen.");
      return;
    }
    setHandled((h) => ({ ...h, ...Object.fromEntries(userIds.map((id) => [id, "approved" as const])) }));
    router.refresh();
  }

  async function decline(userId: string) {
    if (!window.confirm("Afvis anmodningen?")) return;
    setBusy(userId);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .eq("status", "pending");
    setBusy(null);
    if (error) {
      setError("Det lykkedes ikke. Prøv igen.");
      return;
    }
    setHandled((h) => ({ ...h, [userId]: "declined" }));
    router.refresh();
  }

  if (requests.length === 0 || open.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-deep-700 shadow-sm ring-1 ring-mist-100">
        {Object.keys(handled).length > 0 ? "Alle anmodninger er behandlet." : "Ingen ventende anmodninger."}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {open.length > 1 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => approve(open.map((r) => r.user_id))}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-lg bg-mist-100 px-3 py-1.5 text-sm font-semibold text-deep-900 hover:bg-mist-50 disabled:opacity-50"
          >
            {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" aria-hidden />}
            Godkend alle ({open.length})
          </button>
        </div>
      )}

      <ul className="divide-y divide-mist-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
        {open.map((r) => {
          const name = r.profile?.display_name ?? r.profile?.username ?? "Ukendt";
          return (
            <li key={r.user_id} className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                {r.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.profile.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-reed-500 font-semibold text-white">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {r.profile ? (
                    <Link href={`/u/${r.profile.username}`} className="font-semibold text-deep-950 hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-deep-950">{name}</span>
                  )}
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-deep-700">
                    {r.profile && <span>@{r.profile.username}</span>}
                    {r.profile?.city && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {r.profile.city}
                      </span>
                    )}
                    <span>{timeAgo(r.requested_at)}</span>
                  </p>
                  {r.request_message && (
                    <p className="mt-2 rounded-xl bg-mist-50 px-3 py-2 text-sm text-deep-900">&quot;{r.request_message}&quot;</p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-xs text-reed-500">
                    <Check className="h-3 w-3" aria-hidden />
                    Har accepteret reglerne
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => approve([r.user_id])}
                  disabled={busy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-deep-900 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800 disabled:opacity-50"
                >
                  {busy === r.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" aria-hidden />}
                  Godkend
                </button>
                <button
                  type="button"
                  onClick={() => decline(r.user_id)}
                  disabled={busy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-mist-100 py-2 text-sm font-semibold text-deep-900 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden />
                  Afvis
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
