// src/components/challenge-card.tsx
// NY FIL. Viser månedens aktive udfordring(er) med brugerens fremskridt. Bruges øverst i feedet.

import { createClient } from "@/lib/supabase/server";

type ActiveChallenge = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  starts_on: string;
  ends_on: string;
  progress: number;
  goal_value: number;
  completed: boolean;
  participants: number;
};

function daysLeft(endsOn: string) {
  // Slutdatoen tæller med, så vi regner til midnat efter slutdatoen (dansk tid)
  const now = new Date();
  const todayDk = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Copenhagen" }));
  const end = new Date(`${endsOn}T23:59:59`);
  return Math.max(0, Math.ceil((end.getTime() - todayDk.getTime()) / 86_400_000));
}

export default async function ChallengeCard() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_active_challenges");
  if (error || !data || data.length === 0) return null;

  const challenges = data as ActiveChallenge[];

  return (
    <>
      {challenges.map((c) => {
        const pct = Math.min(100, Math.round((c.progress / c.goal_value) * 100));
        const left = daysLeft(c.ends_on);
        return (
          <section
            key={c.id}
            className={`overflow-hidden rounded-2xl p-4 shadow-sm ${
              c.completed ? "bg-deep-900 text-mist-50" : "bg-white ring-1 ring-mist-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${
                  c.completed ? "bg-deep-800" : "bg-mist-100"
                }`}
                aria-hidden
              >
                {c.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${c.completed ? "text-lure-400" : "text-reed-500"}`}>
                  Månedens udfordring
                </p>
                <h2 className={`font-bold ${c.completed ? "text-mist-50" : "text-deep-950"}`}>{c.title}</h2>
                <p className={`text-sm ${c.completed ? "text-reed-300" : "text-deep-700"}`}>{c.description}</p>
              </div>
            </div>

            <div className="mt-3">
              <div className={`h-2.5 overflow-hidden rounded-full ${c.completed ? "bg-deep-800" : "bg-mist-100"}`}>
                <div className="h-full rounded-full bg-lure-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className={`mt-1.5 flex items-center justify-between text-xs ${c.completed ? "text-reed-300" : "text-deep-700"}`}>
                <span>
                  {c.completed ? (
                    <span className="font-semibold text-lure-400">Gennemført! 🏁</span>
                  ) : (
                    <>
                      <span className="font-bold text-deep-950">{Math.min(c.progress, c.goal_value)}</span> af {c.goal_value}
                    </>
                  )}
                </span>
                <span>
                  {c.participants > 0 && `${c.participants} har klaret den · `}
                  {left === 0 ? "Sidste dag" : `${left} ${left === 1 ? "dag" : "dage"} tilbage`}
                </span>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
