// src/app/(app)/layout.tsx
// OPDATERET (gæster ser feed, profiler og grupper i en gæsteramme med "Opret profil").
// Fælles layout for siderne bag login. Loggede brugere med færdig profil får app-rammen (sidebar/topbar).

import { getCurrentProfile, requireProfile } from "@/lib/auth";
import AppShell from "@/components/app-shell";
import GuestShell from "@/components/guest-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await getCurrentProfile();

  // Gæst: kun feed, profiler og grupper er åbne (resten sender proxy og siderne selv til login)
  if (!userId) return <GuestShell>{children}</GuestShell>;

  const profile = await requireProfile();
  return (
    <AppShell username={profile.username} displayName={profile.display_name} avatarUrl={profile.avatar_url}>
      {children}
    </AppShell>
  );
}
