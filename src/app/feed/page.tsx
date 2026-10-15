// src/app/feed/page.tsx
// NY FIL. Midlertidig feed-side til at teste login. Erstattes af det rigtige feed senere.

import { createClient } from "@/lib/supabase/server";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-deep-900">Feed</h1>
      <p className="mt-2 text-deep-700">
        Du er logget ind som <strong>{email ?? "ukendt"}</strong>.
      </p>
      <form action="/auth/signout" method="post" className="mt-6">
        <button
          type="submit"
          className="rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800"
        >
          Log ud
        </button>
      </form>
    </main>
  );
}
