// src/app/velkommen/onboarding-form.tsx
// NY FIL. Formular til første opsætning af profilen: brugernavn, navn, by og erfaringsniveau.

"use client";

import { useActionState } from "react";
import { saveOnboarding, type OnboardingState } from "./actions";

const LEVELS = [
  { value: "begynder", label: "Begynder", hint: "Jeg er ny eller fisker sjældent" },
  { value: "oevet", label: "Øvet", hint: "Jeg fisker jævnligt" },
  { value: "erfaren", label: "Erfaren", hint: "Mange år ved vandet" },
  { value: "ekspert", label: "Ekspert", hint: "Guide, instruktør eller fanatiker" },
];

const inputClass =
  "w-full rounded-lg border border-mist-100 bg-mist-50 px-3 py-2.5 text-deep-950 outline-none focus:border-deep-700 focus:bg-white";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-700">{msg}</p>;
}

export default function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    saveOnboarding,
    {}
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="display_name" className="mb-1 block text-sm font-medium text-deep-900">
          Dit navn
        </label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={defaultName}
          required
          maxLength={50}
          className={inputClass}
        />
        <FieldError msg={fe.display_name} />
      </div>

      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium text-deep-900">
          Brugernavn
        </label>
        <div className="flex items-center rounded-lg border border-mist-100 bg-mist-50 focus-within:border-deep-700 focus-within:bg-white">
          <span className="pl-3 text-deep-700">@</span>
          <input
            id="username"
            name="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]{3,20}"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="fx havoerred_mick"
            className="w-full bg-transparent px-1 py-2.5 text-deep-950 outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-deep-700">Små bogstaver a–z, tal og _. Bruges i din profil-URL.</p>
        <FieldError msg={fe.username} />
      </div>

      <div>
        <label htmlFor="city" className="mb-1 block text-sm font-medium text-deep-900">
          By <span className="font-normal text-deep-700">(valgfri)</span>
        </label>
        <input id="city" name="city" maxLength={50} placeholder="fx Kolding" className={inputClass} />
        <FieldError msg={fe.city} />
      </div>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-deep-900">Erfaringsniveau</legend>
        <div className="grid grid-cols-2 gap-2">
          {LEVELS.map((l) => (
            <label
              key={l.value}
              className="cursor-pointer rounded-lg border border-mist-100 bg-mist-50 p-3 transition has-[:checked]:border-deep-700 has-[:checked]:bg-white has-[:checked]:shadow-sm"
            >
              <input type="radio" name="experience_level" value={l.value} required className="sr-only" />
              <span className="block text-sm font-semibold text-deep-900">{l.label}</span>
              <span className="block text-xs text-deep-700">{l.hint}</span>
            </label>
          ))}
        </div>
        <FieldError msg={fe.experience_level} />
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-deep-900 py-2.5 text-sm font-semibold text-mist-50 transition hover:bg-deep-800 disabled:opacity-60"
      >
        {pending ? "Gemmer..." : "Kom i gang"}
      </button>
    </form>
  );
}
