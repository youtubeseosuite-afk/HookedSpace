// src/app/(app)/u/[username]/profile-menu.tsx
// NY FIL. Menu (•••) på andres profil: "Rapportér profil" og "Bloker" / "Fjern blokering".

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Flag, UserX, UserCheck, Loader2 } from "lucide-react";
import { blockUser, unblockUser } from "@/lib/blocks";
import ReportDialog from "@/components/report-dialog";

export default function ProfileMenu({
  userId,
  name,
  initiallyBlocked,
}: {
  userId: string;
  name: string;
  initiallyBlocked: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggleBlock() {
    if (!initiallyBlocked) {
      const ok = window.confirm(
        `Bloker ${name}? I kan ikke længere se hinandens opslag og kommentarer, og I holder op med at følge hinanden. ${name} får ikke besked.`
      );
      if (!ok) return;
    }
    setError(null);
    setBusy(true);
    const err = initiallyBlocked ? await unblockUser(userId) : await blockUser(userId);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Flere valg"
        aria-expanded={open}
        disabled={busy}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-100 text-deep-900 hover:bg-mist-50 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-mist-100">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setReporting(true);
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-deep-950 hover:bg-mist-50"
          >
            <Flag className="h-4 w-4" aria-hidden />
            Rapportér profil
          </button>
          <button
            type="button"
            onClick={toggleBlock}
            disabled={busy}
            className={`flex w-full items-center gap-2 border-t border-mist-100 px-4 py-3 text-left text-sm font-medium ${
              initiallyBlocked ? "text-deep-950 hover:bg-mist-50" : "text-red-700 hover:bg-red-50"
            }`}
          >
            {initiallyBlocked ? <UserCheck className="h-4 w-4 shrink-0" aria-hidden /> : <UserX className="h-4 w-4 shrink-0" aria-hidden />}
            <span className="truncate">{initiallyBlocked ? "Fjern blokering" : `Bloker ${name}`}</span>
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="absolute right-0 top-11 z-20 w-56 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 shadow">
          {error}
        </p>
      )}

      {reporting && <ReportDialog targetType="user" targetId={userId} onClose={() => setReporting(false)} />}
    </div>
  );
}
