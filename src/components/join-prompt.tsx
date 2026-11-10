// src/components/join-prompt.tsx
// NY FIL. Boks der beder gæster om at oprette en profil (med Google eller email).
// Åbnes fra hvor som helst med openJoinPrompt("…"). <JoinPromptHost /> skal ligge én gang på siden.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoBadge } from "@/components/logo";

const EVENT = "fiskoman:join";

type JoinWindow = Window & { __fiskomanJoinHost?: boolean };

export function openJoinPrompt(reason?: string) {
  // Ingen boks på siden: send til opret-siden i stedet
  if (!(window as JoinWindow).__fiskomanJoinHost) {
    window.location.href = `/login?opret=1&next=${encodeURIComponent(window.location.pathname)}`;
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: reason ?? null }));
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function JoinPromptHost() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setReason((e as CustomEvent<string | null>).detail);
      setOpen(true);
    };
    (window as JoinWindow).__fiskomanJoinHost = true;
    window.addEventListener(EVENT, onOpen);
    return () => {
      (window as JoinWindow).__fiskomanJoinHost = false;
      window.removeEventListener(EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const next = pathname || "/feed";

  async function google() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-deep-950/60 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-title"
    >
      <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-6 text-center shadow-xl sm:rounded-2xl">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Luk"
          className="absolute right-3 top-3 rounded-full p-1.5 text-deep-700 hover:bg-mist-100"
        >
          <X className="h-5 w-5" />
        </button>
        <LogoBadge size="xl" className="mx-auto mb-3 ring-1 ring-mist-100" />
        <h2 id="join-title" className="text-xl font-bold text-deep-950">
          {reason ?? "Bliv en del af FiskoMan"}
        </h2>
        <p className="mt-1 text-sm text-deep-700">
          Det er gratis. Del dine fangster, giv Knæk og bræk, følg andre lystfiskere og saml badges.
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-deep-950 ring-1 ring-mist-100 hover:bg-mist-50 disabled:opacity-60"
          >
            <GoogleIcon /> Fortsæt med Google
          </button>
          <Link
            href={`/login?opret=1&next=${encodeURIComponent(next)}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-deep-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-deep-800"
          >
            <Mail className="h-4 w-4" aria-hidden /> Opret med email
          </Link>
        </div>

        <p className="mt-4 text-sm text-deep-700">
          Har du allerede en profil?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-deep-900 underline">
            Log ind
          </Link>
        </p>
      </div>
    </div>
  );
}
