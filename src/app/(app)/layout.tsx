// src/app/(app)/layout.tsx
// OPDATERET (højre sidebar med de 5 nyeste auktioner på tablet og desktop).
// Fælles layout for siderne bag login. Loggede brugere med færdig profil får app-rammen (sidebar/topbar).

import { getCurrentProfile, requireProfile } from "@/lib/auth";
import AppShell from "@/components/app-shell";
import GuestShell from "@/components/guest-shell";
import AuctionRail from "@/components/auction-rail";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await getCurrentProfile();

  // Gæst: kun feed, profiler og grupper er åbne (resten sender proxy og siderne selv til login)
  if (!userId) return <GuestShell rightRail={<AuctionRail loggedIn={false} />}>{children}</GuestShell>;

  const profile = await requireProfile();
  return (
    <AppShell
      username={profile.username}
      displayName={profile.display_name}
      avatarUrl={profile.avatar_url}
      rightRail={<AuctionRail loggedIn />}
    >
      {children}
    </AppShell>
  );
}
