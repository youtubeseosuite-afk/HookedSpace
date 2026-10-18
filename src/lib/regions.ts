// src/lib/regions.ts
// NY FIL. Landsdele (fiskeriområder) brugt til at fremhæve opslag fra dit område i feedet.
// Nøglerne matcher databasen (profiles.region).

export const REGIONS = [
  { key: "nordjylland", label: "Nordjylland" },
  { key: "midt-vestjylland", label: "Midt- og Vestjylland" },
  { key: "oestjylland", label: "Østjylland" },
  { key: "sydjylland", label: "Sydjylland og Trekantområdet" },
  { key: "soenderjylland", label: "Sønderjylland" },
  { key: "fyn", label: "Fyn og øerne" },
  { key: "sjaelland", label: "Sjælland" },
  { key: "hovedstaden", label: "København og Nordsjælland" },
  { key: "lolland-falster", label: "Lolland, Falster og Møn" },
  { key: "bornholm", label: "Bornholm" },
] as const;

export type RegionKey = (typeof REGIONS)[number]["key"];

export const REGION_KEYS: readonly string[] = REGIONS.map((r) => r.key);

export function regionLabel(key: string | null | undefined) {
  return REGIONS.find((r) => r.key === key)?.label ?? null;
}
