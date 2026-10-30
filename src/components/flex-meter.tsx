// src/components/flex-meter.tsx
// OPDATERET (samme stang-ikon for alle). Flex på profilen: samlet Flex, niveau og hvor langt der er til næste niveau.

import Link from "next/link";
import { flexLevel, nextFlexLevel, formatFlex } from "@/lib/flex";
import { FlexIcon } from "./flex-badge";

export default function FlexMeter({ points }: { points: number }) {
  const lvl = flexLevel(points);
  const next = nextFlexLevel(points);
  const pct = next ? Math.min(100, Math.round(((points - lvl.min) / (next.min - lvl.min)) * 100)) : 100;

  return (
    <Link
      href="/flex"
      className="mt-4 flex items-center gap-3 rounded-xl bg-deep-900 px-4 py-3 text-mist-50 transition hover:bg-deep-800"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-deep-800 text-lure-400">
        <FlexIcon className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span>
            <span className="text-lg font-bold tabular-nums">{formatFlex(points)}</span>{" "}
            <span className="text-sm text-reed-300">Flex</span>
          </span>
          <span className="truncate text-sm font-semibold text-lure-400">
            Niveau {lvl.level} · {lvl.name}
          </span>
        </span>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-deep-800" aria-hidden>
          <span className="block h-full rounded-full bg-lure-400" style={{ width: `${pct}%` }} />
        </span>
        <span className="mt-1 block text-xs text-reed-300">
          {next
            ? `${(next.min - points).toLocaleString("da-DK")} Flex til ${next.name}`
            : "Højeste niveau. Linen holdt ikke!"}
        </span>
      </span>
    </Link>
  );
}
