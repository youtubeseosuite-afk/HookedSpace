// src/app/(app)/grupper/ny/group-form.tsx
// OPDATERET (sender dig til den nye gruppes side). Formular til at oprette en gruppe: navn, adresse (slug), beskrivelse, område, offentlig/privat og regler.
// Du bliver automatisk admin for gruppen.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Plus, Trash2, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Rule = { id: string; title: string; body: string };

const MAX_RULES = 10;

const SUGGESTED_RULES = [
  { title: "Vær venlig og respektfuld", body: "Vi taler pænt til hinanden, også når vi er uenige." },
  { title: "Del ikke andres pladser", body: "Del ikke præcise fiskepladser uden lov fra den, der fandt dem." },
  { title: "Overhold fredningstider og mindstemål", body: "Opslag med fisk fanget i strid med reglerne bliver fjernet." },
  { title: "Ingen reklame eller spam", body: "Salg og reklame kun efter aftale med en admin." },
  { title: "Hold dig til emnet", body: "Opslag skal handle om lystfiskeri og gruppens område." },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

const inputClass =
  "w-full rounded-lg border border-mist-100 bg-mist-50 px-3 py-2.5 text-deep-950 outline-none focus:border-deep-700 focus:bg-white";

export default function GroupForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [rules, setRules] = useState<Rule[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  function addRule(title = "", body = "") {
    if (rules.length >= MAX_RULES) return;
    setRules((r) => [...r, { id: crypto.randomUUID(), title, body }]);
  }

  function updateRule(id: string, field: "title" | "body", value: string) {
    setRules((r) => r.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  function moveRule(index: number, dir: -1 | 1) {
    setRules((r) => {
      const next = [...r];
      const target = index + dir;
      if (target < 0 || target >= next.length) return r;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const unusedSuggestions = SUGGESTED_RULES.filter((s) => !rules.some((r) => r.title === s.title));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanSlug = slugify(effectiveSlug);
    if (cleanName.length < 3) return setError("Navnet skal være mindst 3 tegn.");
    if (cleanSlug.length < 3) return setError("Adressen skal være mindst 3 tegn (a–z, 0–9 og bindestreg).");
    const filledRules = rules.filter((r) => r.title.trim());

    setSubmitting(true);
    const supabase = createClient();

    const { data: group, error: groupErr } = await supabase
      .from("groups")
      .insert({
        slug: cleanSlug,
        name: cleanName,
        description: description.trim() || null,
        city: city.trim() || null,
        privacy,
        created_by: userId,
      })
      .select("id, slug")
      .single();

    if (groupErr || !group) {
      setSubmitting(false);
      if (groupErr?.code === "23505") return setError("Adressen er allerede taget. Vælg en anden.");
      return setError("Gruppen kunne ikke oprettes. Prøv igen.");
    }

    if (filledRules.length > 0) {
      const { error: rulesErr } = await supabase.from("group_rules").insert(
        filledRules.map((r, i) => ({
          group_id: group.id,
          position: i,
          title: r.title.trim(),
          body: r.body.trim() || null,
        }))
      );
      if (rulesErr) {
        // Gruppen er oprettet. Reglerne kan tilføjes igen under gruppens indstillinger.
        setSubmitting(false);
        return setError("Gruppen er oprettet, men reglerne kunne ikke gemmes. Du kan tilføje dem under gruppens indstillinger.");
      }
    }

    router.push(`/g/${group.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-deep-900">Navn på gruppen</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
            maxLength={60}
            placeholder="fx Havørredfiskere i Trekantområdet"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-deep-900">Adresse</label>
          <div className="flex items-center rounded-lg border border-mist-100 bg-mist-50 focus-within:border-deep-700 focus-within:bg-white">
            <span className="whitespace-nowrap pl-3 text-sm text-deep-700">hookedspace.com/g/</span>
            <input
              id="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              maxLength={50}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full min-w-0 bg-transparent py-2.5 pr-3 text-deep-950 outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-deep-900">
            Beskrivelse <span className="font-normal text-deep-700">(valgfri)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Hvad handler gruppen om, og hvem er den for?"
            className={`${inputClass} resize-y`}
          />
        </div>

        <div>
          <label htmlFor="city" className="mb-1 block text-sm font-medium text-deep-900">
            Område <span className="font-normal text-deep-700">(valgfri)</span>
          </label>
          <input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={50}
            placeholder="fx Kolding, Gudenåen eller Hele Danmark"
            className={inputClass}
          />
        </div>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-deep-900">Hvem kan se opslagene?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: "public", icon: Globe, label: "Offentlig", hint: "Alle kan se opslagene. Kun medlemmer kan skrive." },
                { value: "private", icon: Lock, label: "Privat", hint: "Kun medlemmer kan se og skrive opslag." },
              ] as const
            ).map(({ value, icon: Icon, label, hint }) => (
              <label
                key={value}
                className="flex cursor-pointer gap-3 rounded-xl border border-mist-100 bg-mist-50 p-3 has-[:checked]:border-deep-700 has-[:checked]:bg-white has-[:checked]:shadow-sm"
              >
                <input
                  type="radio"
                  name="privacy"
                  value={value}
                  checked={privacy === value}
                  onChange={() => setPrivacy(value)}
                  className="sr-only"
                />
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-deep-800" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-deep-900">{label}</span>
                  <span className="block text-xs text-deep-700">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-deep-700">
            Uanset hvad kan alle finde gruppen og læse reglerne. Nye medlemmer skal altid godkendes af en admin.
          </p>
        </fieldset>
      </section>

      {/* Regler */}
      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100">
        <div>
          <h2 className="font-semibold text-deep-900">Regler</h2>
          <p className="text-sm text-deep-700">Nye medlemmer skal acceptere reglerne, før de kan anmode om at blive medlem.</p>
        </div>

        {rules.map((rule, i) => (
          <div key={rule.id} className="space-y-2 rounded-xl bg-mist-50 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-deep-900 text-xs font-bold text-lure-400">
                {i + 1}
              </span>
              <input
                value={rule.title}
                onChange={(e) => updateRule(rule.id, "title", e.target.value)}
                maxLength={80}
                placeholder="Regel"
                aria-label={`Regel ${i + 1}`}
                className="min-w-0 flex-1 rounded-lg border border-mist-100 bg-white px-3 py-2 text-sm font-medium text-deep-950 outline-none focus:border-deep-700"
              />
              <button type="button" onClick={() => moveRule(i, -1)} disabled={i === 0} aria-label="Flyt op" className="rounded p-1 text-deep-700 hover:bg-white disabled:opacity-30">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => moveRule(i, 1)} disabled={i === rules.length - 1} aria-label="Flyt ned" className="rounded p-1 text-deep-700 hover:bg-white disabled:opacity-30">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setRules((r) => r.filter((x) => x.id !== rule.id))}
                aria-label="Fjern regel"
                className="rounded p-1 text-deep-700 hover:bg-white hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={rule.body}
              onChange={(e) => updateRule(rule.id, "body", e.target.value)}
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
            onClick={() => addRule()}
            className="flex items-center gap-2 rounded-lg bg-mist-100 px-3 py-2 text-sm font-semibold text-deep-900 hover:bg-mist-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tilføj regel
          </button>
        )}

        {unusedSuggestions.length > 0 && rules.length < MAX_RULES && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-deep-700">Forslag (klik for at tilføje):</p>
            <div className="flex flex-wrap gap-2">
              {unusedSuggestions.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => addRule(s.title, s.body)}
                  className="rounded-full border border-mist-100 bg-white px-3 py-1 text-xs font-medium text-deep-800 hover:border-deep-700"
                >
                  + {s.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-deep-900 py-3 text-sm font-semibold text-mist-50 hover:bg-deep-800 disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Opret gruppe
      </button>
    </form>
  );
}
