// src/components/badge-list.tsx
// NY FIL. Viser brugerens badges. Badges man mangler kan foldes ud, så man kan se, hvad man kan gå efter.

import { Award } from "lucide-react";

export type BadgeItem = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "milepael" | "artsjagt" | "ekspert" | "saeson";
  sort: number;
};

const CATEGORY_LABEL: Record<BadgeItem["category"], string> = {
  milepael: "Milepæle",
  artsjagt: "Artsjagt",
  saeson: "Sæson",
  ekspert: "Ekspert",
};

function BadgeChip({ badge, earned }: { badge: BadgeItem; earned: boolean }) {
  return (
    <li
      title={badge.description}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
        earned ? "bg-deep-900 text-mist-50" : "bg-mist-50 text-deep-700/60"
      }`}
    >
      <span className={`text-lg leading-none ${earned ? "" : "opacity-40 grayscale"}`} aria-hidden>
        {badge.emoji}
      </span>
      <span className="min-w-0">
        <span className={`block truncate text-sm font-semibold ${earned ? "" : "text-deep-700/70"}`}>{badge.name}</span>
        <span className={`block truncate text-xs ${earned ? "text-reed-300" : ""}`}>{badge.description}</span>
      </span>
    </li>
  );
}

export default function BadgeList({
  allBadges,
  earnedIds,
  isMe,
}: {
  allBadges: BadgeItem[];
  earnedIds: string[];
  isMe: boolean;
}) {
  const earnedSet = new Set(earnedIds);
  const earned = allBadges.filter((b) => earnedSet.has(b.id));
  // Ekspert-badges man mangler, vises ikke (der er én pr. art, så listen bliver for lang)
  const missing = allBadges.filter((b) => !earnedSet.has(b.id) && b.category !== "ekspert");

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
      <h2 className="mb-3 flex items-center justify-between gap-2 font-semibold text-deep-950">
        <span className="flex items-center gap-2">
          <Award className="h-5 w-5 text-lure-500" aria-hidden />
          Badges
        </span>
        <span className="text-sm font-normal text-deep-700">
          <span className="font-bold text-deep-950">{earned.length}</span> optjent
        </span>
      </h2>

      {earned.length === 0 ? (
        <p className="text-sm text-deep-700">
          {isMe ? "Du har ingen badges endnu. Del din første fangst for at komme i gang." : "Ingen badges endnu."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {earned.map((b) => (
            <BadgeChip key={b.id} badge={b} earned />
          ))}
        </ul>
      )}

      {isMe && missing.length > 0 && (
        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-deep-700 hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Se badges du kan gå efter ({missing.length})</span>
            <span className="hidden group-open:inline">Skjul</span>
          </summary>
          <div className="mt-3 space-y-3">
            {(["milepael", "artsjagt", "saeson"] as const).map((cat) => {
              const items = missing.filter((b) => b.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-deep-700">
                    {CATEGORY_LABEL[cat]}
                  </h3>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {items.map((b) => (
                      <BadgeChip key={b.id} badge={b} earned={false} />
                    ))}
                  </ul>
                </div>
              );
            })}
            <p className="text-xs text-deep-700">Plus et ekspert-badge for hver art, når du har fanget 10 af den.</p>
          </div>
        </details>
      )}
    </section>
  );
}
