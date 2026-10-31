// src/app/(app)/g/[slug]/admin/group-settings.tsx
// OPDATERET (nyt navn: FiskoMan). Gruppens indstillinger: navn, beskrivelse, område og offentlig/privat. Samt "Slet gruppe".
// Adressen (/g/...) kan ikke ændres, så links til gruppen bliver ved med at virke.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Loader2, Check, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Group = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  privacy: "public" | "private";
};

const inputClass =
  "w-full rounded-lg border border-mist-100 bg-mist-50 px-3 py-2.5 text-deep-950 outline-none focus:border-deep-700 focus:bg-white";

export default function GroupSettings({ group }: { group: Group }) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [city, setCity] = useState(group.city ?? "");
  const [privacy, setPrivacy] = useState(group.privacy);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (name.trim().length < 3) return setError("Navnet skal være mindst 3 tegn.");
    if (privacy === "public" && group.privacy === "private") {
      if (!window.confirm("Gør gruppen offentlig? Så kan alle se gruppens opslag, også dem der allerede er skrevet.")) return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        city: city.trim() || null,
        privacy,
      })
      .eq("id", group.id);
    setSaving(false);
    if (error) return setError("Ændringerne kunne ikke gemmes. Prøv igen.");
    setSaved(true);
    router.refresh();
  }

  async function deleteGroup() {
    if (confirmName.trim() !== group.name || deleting) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("groups").delete().eq("id", group.id);
    if (error) {
      setDeleting(false);
      return setError("Gruppen kunne ikke slettes. Prøv igen.");
    }
    router.push("/grupper");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100">
        <div>
          <label htmlFor="g-name" className="mb-1 block text-sm font-medium text-deep-900">Navn</label>
          <input id="g-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={60} className={inputClass} />
          <p className="mt-1 text-xs text-deep-700">Adressen fiskoman.dk/g/{group.slug} ændres ikke.</p>
        </div>
        <div>
          <label htmlFor="g-desc" className="mb-1 block text-sm font-medium text-deep-900">Beskrivelse</label>
          <textarea
            id="g-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </div>
        <div>
          <label htmlFor="g-city" className="mb-1 block text-sm font-medium text-deep-900">Område</label>
          <input id="g-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={50} className={inputClass} />
        </div>
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-deep-900">Hvem kan se opslagene?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: "public", icon: Globe, label: "Offentlig", hint: "Alle kan se opslagene." },
                { value: "private", icon: Lock, label: "Privat", hint: "Kun medlemmer kan se opslagene." },
              ] as const
            ).map(({ value, icon: Icon, label, hint }) => (
              <label
                key={value}
                className="flex cursor-pointer gap-3 rounded-xl border border-mist-100 bg-mist-50 p-3 has-[:checked]:border-deep-700 has-[:checked]:bg-white has-[:checked]:shadow-sm"
              >
                <input type="radio" name="g-privacy" checked={privacy === value} onChange={() => setPrivacy(value)} className="sr-only" />
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-deep-800" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-deep-900">{label}</span>
                  <span className="block text-xs text-deep-700">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Gem ændringer
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm font-medium text-reed-500">
              <Check className="h-4 w-4" aria-hidden />
              Gemt
            </span>
          )}
        </div>
      </form>

      {/* Slet gruppe */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100">
        <h3 className="text-sm font-semibold text-deep-900">Slet gruppe</h3>
        <p className="mt-1 text-sm text-deep-700">
          Gruppen, reglerne og medlemslisten slettes. Medlemmernes opslag slettes ikke. De flyttes til deres egne profiler
          som &quot;Kun mig&quot;.
        </p>
        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
          >
            Slet gruppe
          </button>
        ) : (
          <div className="mt-3 space-y-3 rounded-xl bg-red-50 p-4">
            <p className="flex items-start gap-2 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Det kan ikke fortrydes. Skriv gruppens navn for at bekræfte:
            </p>
            <p className="text-sm font-semibold text-red-900">{group.name}</p>
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              aria-label="Skriv gruppens navn"
              autoComplete="off"
              className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-deep-950 outline-none focus:border-red-500"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={deleteGroup}
                disabled={confirmName.trim() !== group.name || deleting}
                className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-40"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Slet gruppen permanent
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setConfirmName("");
                }}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-deep-700 hover:bg-white"
              >
                Annuller
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
