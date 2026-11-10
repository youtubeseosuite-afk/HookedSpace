// src/components/presence-tracker.tsx
// NY FIL. Melder til Supabase Realtime, at besøgende er online, og hvilken slags side de er på.
// Bruges af "Lige nu" på admin-siden. Intet gemmes i databasen. Admin-siderne tælles ikke med.

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE_CHANNEL, sectionFor, type PresenceMeta } from "@/lib/presence";

export default function PresenceTracker() {
  const pathname = usePathname() ?? "/";
  const channelRef = useRef<RealtimeChannel | null>(null);
  const readyRef = useRef(false);
  const metaRef = useRef<PresenceMeta>({ uid: null, section: sectionFor(pathname), at: Date.now() });
  const isAdminPage = pathname.startsWith("/admin");

  // Forbind én gang (rodlayoutet bliver liggende, når man skifter side)
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      metaRef.current.uid = data.session?.user.id ?? null;

      const channel = supabase.channel(PRESENCE_CHANNEL, {
        config: { presence: { key: crypto.randomUUID() } },
      });
      channelRef.current = channel;
      channel.subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        readyRef.current = true;
        if (!window.location.pathname.startsWith("/admin")) await channel.track(metaRef.current);
      });
    })();

    // Log ind / log ud: opdater, om man er medlem eller gæst
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id ?? null;
      if (uid === metaRef.current.uid) return;
      metaRef.current = { ...metaRef.current, uid };
      if (channelRef.current && readyRef.current && !window.location.pathname.startsWith("/admin")) {
        channelRef.current.track(metaRef.current);
      }
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      readyRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // Opdater siden, når man navigerer
  useEffect(() => {
    const channel = channelRef.current;
    metaRef.current = { ...metaRef.current, section: sectionFor(pathname), at: Date.now() };
    if (!channel || !readyRef.current) return;
    if (isAdminPage) channel.untrack();
    else channel.track(metaRef.current);
  }, [pathname, isAdminPage]);

  return null;
}
