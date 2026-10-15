// src/lib/feelings.ts
// NY FIL. Listen over følelser man kan sætte på et opslag. Nøglerne matcher databasen (posts.feeling).

export const FEELINGS = [
  { key: "glad", label: "glad", emoji: "😊" },
  { key: "stolt", label: "stolt", emoji: "💪" },
  { key: "begejstret", label: "begejstret", emoji: "🤩" },
  { key: "taknemmelig", label: "taknemmelig", emoji: "🙏" },
  { key: "heldig", label: "heldig", emoji: "🍀" },
  { key: "afslappet", label: "afslappet", emoji: "😌" },
  { key: "spaendt", label: "spændt", emoji: "😬" },
  { key: "traet", label: "træt", emoji: "😴" },
  { key: "frustreret", label: "frustreret", emoji: "😤" },
  { key: "skuffet", label: "skuffet", emoji: "😞" },
] as const;

export type FeelingKey = (typeof FEELINGS)[number]["key"];

export function getFeeling(key: string | null | undefined) {
  return FEELINGS.find((f) => f.key === key) ?? null;
}
