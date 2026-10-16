// src/app/(app)/g/[slug]/admin/rules-editor.tsx
// NY FIL. Rediger gruppens regler: tilføj, ret, flyt op/ned og fjern. Gemmes samlet med "Gem regler".

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type RuleRow = { id: string; title: string; body: string | null };

const MAX_RULES = 10;

const SUGGESTED_RULES = [
  { title: "Vær venlig og respektfuld", body: "Vi taler pænt til hinanden, også når vi er uenige." },
  { title: "Del ikke andres pladser", body: "Del ikke præcise fiskepladser uden lov fra den, der fandt dem." },
  { title: "Overhold fredningstider og mindstemål", body: "Opslag med fisk fanget i strid med reglerne bliver fjernet." },
  { title: "Ingen reklame eller spam", body: "Salg og reklame kun efter aftale med en admin." },
  { title: "Hold dig til emnet", body: "Opslag skal handle om lystfiskeri og gruppens område." },
];

export default function RulesEditor({ groupId, initialRules }: { groupId: string; initialRules: RuleRow[] }) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules.map((r) => ({ ...r, body: r.body ?? "" })));
  // Id'er på de regler der ligger i databasen lige nu (opdateres efter hver gemning)
  const [savedIds, setSavedIds] = useState<string[]>(initialRules.map((r) => r.id));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function change(next: typeof rules) {
    setRules(next);
    setSaved(false);
  }

  function add(title = "", body = "") {
    if (rules.length >= MAX_RULES) return;
    change([...rules, { id: crypto.randomUUID(), title, body }]);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rules.length) return;
    const next = [...rules];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  }

  async function save() {
    setError(null);
    const filled = rules.filter((r) => r.title.trim());
    setSaving(true);
    const supabase = createClient();

    // 1) Gem alle nuværende regler (nye oprettes, eksisterende opdateres)
    if (filled.length > 0) {
      const { error: upErr } = await supabase.from("group_rules").upsert(
        filled.map((r, i) => ({
          id: r.id,
          group_id: groupId,
          position: i,
          title: r.title.trim(),
          body: r.body.trim() || null,
        })),
        { onConflict: "id" }
      );
      if (upErr) {
        setSaving(false);
        return setError("Reglerne kunne ikke gemmes. Prøv igen.");
      }
    }

    // 2) Slet dem der er fjernet
    const keep = new Set(filled.map((r) => r.id));
    const removed = savedIds.filter((id) => !keep.has(id));
    if (removed.length > 0) {
      const { error: delErr } = await supabase.from("group_rules").delete().in("id", removed);
      if (delErr) {
        setSaving(false);
        return setError("Nogle regler kunne ikke fjernes. Prøv igen.");
      }
    }

    setSaving(false);
    setSaved(true);
    setRules(filled);
    setSavedIds(filled.map((r) => r.id));
    router.refresh();
  }

  const unused = SUGGESTED_RULES.filter((s) => !rules.some((r) => r.title === s.title));

  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100">
      <p className="text-sm text-deep-700">
        Nye medlemmer skal acceptere reglerne, før de kan anmode om at blive medlem.
      </p>

      {rules.length === 0 && <p className="text-sm text-deep-700">Gruppen har ingen regler endnu.</p>}

      {rules.map((rule, i) => (
        <div key={rule.id} className="space-y-2 rounded-xl bg-mist-50 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-deep-900 text-xs font-bold text-lure-400">
              {i + 1}
            </span>
            <input
              value={rule.title}
              onChange={(e) => change(rules.map((r) => (r.id === rule.id ? { ...r, title: e.target.value } : r)))}
              maxLength={80}
              placeholder="Regel"
              aria-label={`Regel ${i + 1}`}
              className="min-w-0 flex-1 rounded-lg border border-mist-100 bg-white px-3 py-2 text-sm font-medium text-deep-950 outline-none focus:border-deep-700"
            />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Flyt op" className="rounded p-1 text-deep-700 hover:bg-white disabled:opacity-30">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === rules.length - 1} aria-label="Flyt ned" className="rounded p-1 text-deep-700 hover:bg-white disabled:opacity-30">
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => change(rules.filter((r) => r.id !== rule.id))}
              aria-label="Fjern regel"
              className="rounded p-1 text-deep-700 hover:bg-white hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={rule.body}
            onChange={(e) => change(rules.map((r) => (r.id === rule.id ? { ...r, body: e.target.value } : r)))}
            maxLength={500}
            rows={2}
            placeholder="Uddyb gerne (valgfrit)"
            aria-label={`Uddybning af regel ${i + 1}`}
            className="w-full resize-y rounded-lg border border-mist-100 bg-white px-3 py-2 text-sm text-deep-950 outline-none focus:border-deep-700"
          />
        </div>
      ))}

      {rules.length < MAX_RULES && (
        <button
          type="button"
          onClick={() => add()}
          className="flex items-center gap-2 rounded-lg bg-mist-100 px-3 py-2 text-sm font-semibold text-deep-900 hover:bg-mist-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Tilføj regel
        </button>
      )}

      {unused.length > 0 && rules.length < MAX_RULES && (
        <div className="flex flex-wrap gap-2">
          {unused.map((s) => (
            <button
              key={s.title}
              type="button"
              onClick={() => add(s.title, s.body)}
              className="rounded-full border border-mist-100 bg-white px-3 py-1 text-xs font-medium text-deep-800 hover:border-deep-700"
            >
              + {s.title}
            </button>
          ))}
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-3 border-t border-mist-100 pt-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Gem regler
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-reed-500">
            <Check className="h-4 w-4" aria-hidden />
            Gemt
          </span>
        )}
      </div>
    </div>
  );
}
