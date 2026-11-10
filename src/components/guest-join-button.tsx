// src/components/guest-join-button.tsx
// NY FIL. Knap til gæster (fx "Følg" eller "Bliv medlem"), der åbner boksen "Opret en profil".

"use client";

import { UserPlus } from "lucide-react";
import { openJoinPrompt } from "@/components/join-prompt";

export default function GuestJoinButton({ label, reason }: { label: string; reason: string }) {
  return (
    <button
      type="button"
      onClick={() => openJoinPrompt(reason)}
      className="flex items-center gap-2 rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-mist-50 transition hover:bg-deep-800"
    >
      <UserPlus className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
