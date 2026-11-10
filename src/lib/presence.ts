// src/lib/presence.ts
// NY FIL. Fælles for "Lige nu" (besøgende i realtid): kanalens navn, hvad der sendes, og sidernes navne.
// Der sendes kun bruger-id (eller intet for gæster) og hvilken slags side man er på. Intet gemmes.

export const PRESENCE_CHANNEL = "online";

export type PresenceMeta = {
  uid: string | null; // null = gæst
  section: string; // fx "Feed" eller "Profil"
  at: number; // hvornår siden blev åbnet (ms)
};

export function sectionFor(path: string): string {
  if (path === "/") return "Forside";
  if (path.startsWith("/feed")) return "Feed";
  if (path.startsWith("/u/")) return "Profil";
  if (path.startsWith("/g/")) return "Gruppe";
  if (path.startsWith("/grupper")) return "Grupper";
  if (path.startsWith("/p/")) return "Delt opslag";
  if (path === "/post/ny") return "Ny post";
  if (path.startsWith("/post/")) return "Redigerer opslag";
  if (path.startsWith("/notifikationer")) return "Notifikationer";
  if (path.startsWith("/indstillinger")) return "Indstillinger";
  if (path.startsWith("/opdag")) return "Find fiskere";
  if (path.startsWith("/flex")) return "Flex";
  if (path.startsWith("/login")) return "Login";
  if (path.startsWith("/velkommen")) return "Opretter profil";
  if (path.startsWith("/faq") || path.startsWith("/regler") || path.startsWith("/privatliv")) return "Info";
  return "Andet";
}
