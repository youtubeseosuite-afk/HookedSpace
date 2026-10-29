// src/components/badge-icon.tsx
// NY FIL. Viser et badges billede fra /public/badges/<id>.webp. Badges uden billede vises med deres emoji.

// Badges der har et billede i public/badges. Tilføj id'et her, når der kommer nye billeder.
const WITH_IMAGE = new Set<string>([
  "forste_fangst", "fangster_10", "fangster_50", "fangster_100",
  "forste_genudsat", "genudsat_10", "trofaejaeger", "udfordrer",
  "arter_5", "arter_10", "arter_20", "arter_alle",
  "vinterfisker", "aaret_rundt",
  ...Array.from({ length: 31 }, (_, i) => `ekspert_${i + 1}`),
]);

export function hasBadgeImage(id: string) {
  return WITH_IMAGE.has(id);
}

export default function BadgeIcon({
  id,
  emoji,
  size = 40,
  locked = false,
  className = "",
}: {
  id: string;
  emoji?: string | null;
  size?: number;
  locked?: boolean; // ikke optjent endnu: gråt og svagt
  className?: string;
}) {
  const dim = locked ? "opacity-40 grayscale" : "";

  if (WITH_IMAGE.has(id)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/badges/${id}.webp`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={`shrink-0 rounded-full ${dim} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center leading-none ${dim} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {emoji ?? "🏅"}
    </span>
  );
}
