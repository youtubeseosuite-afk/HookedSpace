// src/components/flex-badge.tsx
// OPDATERET (stangen ser ens ud for alle). Flex-ikonet (en bøjet fiskestang) og Flex-tallet.

import { flexLevel, formatFlex } from "@/lib/flex";

// Flex-ikonet: en bøjet fiskestang med line. Ser ens ud for alle.
export function FlexIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" className={className} aria-hidden>
      {/* Håndtag */}
      <path d="M3 21 L6 18" strokeWidth={3.2} />
      {/* Bøjet stang */}
      <path d="M5 19 Q 17 4 20 13" strokeWidth={1.9} />
      {/* Line ned til fisken */}
      <path d="M20 13 L20 22" strokeWidth={0.9} strokeDasharray="1.5 1.5" />
    </svg>
  );
}

// Lille Flex-mærke: ikon + tal. tone "light" bruges på mørk baggrund.
export default function FlexBadge({
  points,
  size = "sm",
  tone = "default",
  showLabel = false,
}: {
  points: number;
  size?: "xs" | "sm" | "md";
  tone?: "default" | "light";
  showLabel?: boolean;
}) {
  const lvl = flexLevel(points);
  const s = size === "xs" ? "text-[11px] gap-0.5" : size === "sm" ? "text-xs gap-1" : "text-sm gap-1.5";
  const icon = size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const color = tone === "light" ? "text-lure-400" : "text-lure-500";
  return (
    <span
      className={`inline-flex items-center font-semibold tabular-nums ${s} ${tone === "light" ? "text-mist-50" : "text-deep-800"}`}
      title={`${points.toLocaleString("da-DK")} Flex · ${lvl.name}`}
    >
      <FlexIcon className={`${icon} ${color}`} />
      {formatFlex(points)}
      {showLabel && <span className="font-normal opacity-80">Flex</span>}
    </span>
  );
}
