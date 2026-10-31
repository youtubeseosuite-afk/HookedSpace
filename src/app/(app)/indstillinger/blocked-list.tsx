// src/app/(app)/indstillinger/blocked-list.tsx
// NY FIL. Liste over brugere du har blokeret, med "Fjern blokering".

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { unblockUser } from "@/lib/blocks";

export type BlockedUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
};

export default function BlockedList({ users }: { users: BlockedUser[] }) {
  const router = useRouter();
  const [list, setList] = useState(users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function unblock(u: BlockedUser) {
    const name = u.display_name ?? u.username;
    if (!window.confirm(`Fjern blokeringen af ${name}? I kan se hinandens opslag igen, men I følger ikke hinanden automatisk.`)) return;
    setError(null);
    setBusyId(u.id);
    const err = await unblockUser(u.id);
    setBusyId(null);
    if (err) {
      setError(err);
      return;
    }
    setList((cur) => cur.filter((x) => x.id !== u.id));
    router.refresh();
  }

  if (list.length === 0) {
    return <p className="text-sm text-deep-700">Du har ikke blokeret nogen.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-mist-100">
        {list.map((u) => {
          const name = u.display_name ?? u.username;
          return (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link href={`/u/${u.username}`} className="flex min-w-0 items-center gap-3">
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist-100 text-sm font-bold text-deep-800">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-deep-950">{name}</span>
                  <span className="block truncate text-xs text-deep-700">@{u.username}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => unblock(u)}
                disabled={busyId === u.id}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-mist-100 px-3 py-1.5 text-sm font-semibold text-deep-900 hover:bg-mist-50 disabled:opacity-60"
              >
                {busyId === u.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Fjern blokering
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
