// src/app/(app)/layout.tsx
// NY FIL. Fælles layout for alle sider bag login. Kræver færdig profil og viser app-rammen (sidebar/topbar).

import { requireProfile } from "@/lib/auth";
import AppShell from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <AppShell
      username={profile.username}
      displayName={profile.display_name}
      avatarUrl={profile.avatar_url}
    >
      {children}
    </AppShell>
  );
}
