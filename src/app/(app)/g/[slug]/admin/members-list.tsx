// src/app/(app)/g/[slug]/admin/members-list.tsx
// NY FIL. Medlemmer af gruppen: gør til admin, fjern som admin, eller fjern fra gruppen.
// Databasen sørger for, at gruppen altid har mindst én admin.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ShieldOff, UserMinus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Member = {
  user_id: string;
  role: "admin" | "member";
  joined_at: string | null;
  profile: { username: string; display_name: string | null; avatar_url: string | null; city: string | null } | null;
};

function friendlyError(message: string) {
  return message.includes("mindst én admin")
    ? "Gruppen skal have mindst én admin. Gør en anden til admin først."
    : "Det lykkedes ikke. Prøv igen.";
}

export default function MembersList({ groupId, myId, members }: { groupId: string; myId: string; members: Member[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setRole(userId: string, role: "admin" | "member", confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(userId);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("group_members")
      .update({ role })
      .eq("group_id", groupId)
      .eq("user_id", userId);
    setBusy(null);
    if (error) return setError(friendlyError(error.message));
    router.refresh();
  }

  async function remove(userId: string, name: string) {
    if (!window.confirm(`Fjern ${name} fra gruppen?`)) return;
    setBusy(userId);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    setBusy(null);
    if (error) return setError(friendlyError(error.message));
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-mist-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
        {members.map((m) => {
          const name = m.profile?.display_name ?? m.profile?.username ?? "Ukendt";
          const isMe = m.user_id === myId;
          const isAdmin = m.role === "admin";
          return (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 p-4">
              {m.profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.profile.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-reed-500 font-semibold text-white">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  {m.profile ? (
                    <Link href={`/u/${m.profile.username}`} className="truncate font-semibold text-deep-950 hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-deep-950">{name}</span>
                  )}
                  {isAdmin && (
                    <span className="flex items-center gap-1 rounded-full bg-deep-900 px-2 py-0.5 text-[11px] font-semibold text-lure-400">
                      <Shield className="h-3 w-3" aria-hidden />
                      Admin
                    </span>
                  )}
                  {isMe && <span className="text-xs text-deep-700">(dig)</span>}
                </p>
                {m.joined_at && (
                  <p className="text-xs text-deep-700">
                    Medlem siden{" "}
                    {new Date(m.joined_at).toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "Europe/Copenhagen",
                    })}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                {busy === m.user_id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-deep-700" />
                ) : isAdmin ? (
                  <button
                    type="button"
                    onClick={() =>
                      setRole(
                        m.user_id,
                        "member",
                        isMe ? "Vil du fjerne dig selv som admin?" : `Fjern ${name} som admin?`
                      )
                    }
                    disabled={busy !== null}
                    title="Fjern som admin"
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-deep-700 hover:bg-mist-100 disabled:opacity-50"
                  >
                    <ShieldOff className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Fjern admin</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRole(m.user_id, "admin", `Gør ${name} til admin? Admins kan godkende og fjerne medlemmer.`)}
                    disabled={busy !== null}
                    title="Gør til admin"
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-deep-700 hover:bg-mist-100 disabled:opacity-50"
                  >
                    <Shield className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Gør til admin</span>
                  </button>
                )}
                {!isMe && busy !== m.user_id && (
                  <button
                    type="button"
                    onClick={() => remove(m.user_id, name)}
                    disabled={busy !== null}
                    title="Fjern fra gruppen"
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-deep-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    <UserMinus className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Fjern</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
