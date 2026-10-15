// src/app/(app)/u/[username]/follow-button.tsx
// NY FIL. Følg / Følger-knap på profilsiden. Opdaterer med det samme og gemmer i databasen.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function FollowButton({
  myId,
  targetId,
  initiallyFollowing,
  followsMe,
}: {
  myId: string;
  targetId: string;
  initiallyFollowing: boolean;
  followsMe: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [hover, setHover] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  async function toggle() {
    setError(false);
    const next = !following;
    setFollowing(next);
    const supabase = createClient();
    const { error } = next
      ? await supabase.from("follows").insert({ follower_id: myId, following_id: targetId })
      : await supabase.from("follows").delete().eq("follower_id", myId).eq("following_id", targetId);

    if (error) {
      setFollowing(!next);
      setError(true);
      return;
    }
    startTransition(() => router.refresh());
  }

  const label = following ? (hover ? "Stop med at følge" : "Følger") : followsMe ? "Følg tilbage" : "Følg";

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        disabled={pending}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          following
            ? "bg-mist-100 text-deep-900 hover:bg-red-50 hover:text-red-700"
            : "bg-deep-900 text-mist-50 hover:bg-deep-800"
        }`}
      >
        {following ? <UserCheck className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
        {label}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">Det lykkedes ikke. Prøv igen.</p>}
    </div>
  );
}
