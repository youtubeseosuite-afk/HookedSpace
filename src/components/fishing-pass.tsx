// src/components/fishing-pass.tsx
// NY FIL. Fiskepasset (artsjagt): alle arter som felter. Fangede arter er farvede og viser antal og personlig rekord.
// Kan klappes sammen, så profilen ikke bliver for lang på mobil.

import { Fish } from "lucide-react";

export type SpeciesItem = { id: number; name: string; water_type: "salt" | "fersk" | "begge" };
export type SpeciesStat = {
  species_id: number;
  catches: number;
  best_weight_kg: number | null;
  best_length_cm: number | null;
};

function formatNumber(n: number) {
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 2 }).format(n);
}

export default function FishingPass({
  species,
  stats,
  isMe,
}: {
  species: SpeciesItem[];
  stats: SpeciesStat[];
  isMe: boolean;
}) {
  const byId = new Map(stats.map((s) => [s.species_id, s]));
  const caught = species.filter((s) => byId.has(s.id)).length;
  const total = species.length;
  const pct = total > 0 ? Math.round((caught / total) * 100) : 0;

  // Fangede arter først, derefter alfabetisk
  const sorted = [...species].sort((a, b) => {
    const ca = byId.has(a.id) ? 0 : 1;
    const cb = byId.has(b.id) ? 0 : 1;
    return ca - cb || a.name.localeCompare(b.name, "da");
  });

  return (
    <details className="group rounded-2xl bg-white shadow-sm ring-1 ring-mist-100" open={caught > 0 && caught <= 8}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-deep-900 text-lure-400">
          <Fish className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-deep-950">Fiskepas</span>
            <span className="text-sm text-deep-700">
              <span className="font-bold text-deep-950">{caught}</span> af {total} arter
            </span>
          </span>
          <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-mist-100">
            <span className="block h-full rounded-full bg-lure-400 transition-all" style={{ width: `${pct}%` }} />
          </span>
        </span>
        <span className="text-deep-700 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <div className="border-t border-mist-100 p-4">
        {caught === 0 && (
          <p className="mb-3 text-sm text-deep-700">
            {isMe
              ? "Del en fangst med art, så bliver den første art farvet i dit fiskepas."
              : "Ingen arter i fiskepasset endnu."}
          </p>
        )}
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sorted.map((s) => {
            const stat = byId.get(s.id);
            const pr = stat
              ? [
                  stat.best_weight_kg != null && `${formatNumber(stat.best_weight_kg)} kg`,
                  stat.best_length_cm != null && `${formatNumber(stat.best_length_cm)} cm`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "";
            return (
              <li
                key={s.id}
                className={`rounded-xl p-3 ${stat ? "bg-deep-900 text-mist-50" : "bg-mist-50 text-deep-700/50"}`}
              >
                <span className="flex items-center gap-2">
                  <Fish className={`h-4 w-4 shrink-0 ${stat ? "text-lure-400" : ""}`} aria-hidden />
                  <span className={`truncate text-sm font-semibold ${stat ? "" : "text-deep-700/60"}`}>{s.name}</span>
                </span>
                {stat ? (
                  <span className="mt-1 block text-xs text-reed-300">
                    {stat.catches} {stat.catches === 1 ? "fangst" : "fangster"}
                    {pr && (
                      <>
                        <br />
                        <span className="text-lure-400">PR</span> {pr}
                      </>
                    )}
                  </span>
                ) : (
                  <span className="mt-1 block text-xs">Ikke fanget</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
