// src/lib/auction-options.ts
// NY FIL. GrejAuktionen: kategorier, stand og varighed. Kan bruges både i browseren og på serveren.

export const AUCTION_CATEGORIES = [
  { key: "stang", label: "Stænger" },
  { key: "hjul", label: "Hjul" },
  { key: "line", label: "Liner" },
  { key: "agn", label: "Agn og blink" },
  { key: "fluer", label: "Fluer og bindegrej" },
  { key: "waders", label: "Waders og tøj" },
  { key: "baad", label: "Både og motorer" },
  { key: "elektronik", label: "Elektronik og ekkolod" },
  { key: "tasker", label: "Tasker og opbevaring" },
  { key: "andet", label: "Andet" },
] as const;

export const AUCTION_CONDITIONS = [
  { key: "ny", label: "Ny" },
  { key: "som_ny", label: "Som ny" },
  { key: "god", label: "God" },
  { key: "brugt", label: "Brugt" },
  { key: "reservedele", label: "Til reservedele" },
] as const;

export const AUCTION_DURATIONS = [3, 5, 7, 10] as const;

export function categoryLabel(key: string) {
  return AUCTION_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
export function conditionLabel(key: string) {
  return AUCTION_CONDITIONS.find((c) => c.key === key)?.label ?? key;
}
