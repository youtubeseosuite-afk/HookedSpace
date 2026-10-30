// src/lib/flex.ts
// NY FIL. Flex-niveauer og formatering. Grænserne skal passe med public.flex_level() i 015_flex.sql.

export const FLEX_LEVELS = [
  { level: 1, name: "Stiv stang", min: 0 },
  { level: 2, name: "Let nik", min: 50 },
  { level: 3, name: "God bøj", min: 250 },
  { level: 4, name: "Halv bue", min: 1000 },
  { level: 5, name: "Fuld bue", min: 5000 },
  { level: 6, name: "Linebrud", min: 20000 },
] as const;

export type FlexLevel = (typeof FLEX_LEVELS)[number];

export function flexLevel(points: number): FlexLevel {
  let current: FlexLevel = FLEX_LEVELS[0];
  for (const l of FLEX_LEVELS) if (points >= l.min) current = l;
  return current;
}

export function nextFlexLevel(points: number): FlexLevel | null {
  return FLEX_LEVELS.find((l) => l.min > points) ?? null;
}

export function levelByNumber(n: number | null | undefined): FlexLevel {
  return FLEX_LEVELS.find((l) => l.level === n) ?? FLEX_LEVELS[0];
}

// 1240 → "1.240", 15300 → "15,3k"
export function formatFlex(points: number) {
  if (points >= 10000) return `${(points / 1000).toLocaleString("da-DK", { maximumFractionDigits: 1 })}k`;
  return points.toLocaleString("da-DK");
}

export const FLEX_RULES = [
  { label: "Knæk og bræk på dit opslag", points: 1 },
  { label: "Kommentar på dit opslag (én pr. person)", points: 1 },
  { label: "Ny følger", points: 2 },
  { label: "Nogen deler dit opslag", points: 3 },
  { label: "Du optjener et badge", points: 5 },
  { label: "Du klarer en månedsudfordring", points: 10 },
] as const;
