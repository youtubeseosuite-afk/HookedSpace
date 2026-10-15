// src/app/(app)/feed/page.tsx
// NY FIL (flyttet fra src/app/feed/page.tsx). Midlertidig feed-side inde i app-rammen.

import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function FeedPage() {
  const profile = await requireProfile();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-deep-900">Feed</h1>
      <p className="mt-2 text-deep-700">
        Hej {profile.display_name}. Her kommer fangsterne fra dem, du følger.
      </p>
    </main>
  );
}
