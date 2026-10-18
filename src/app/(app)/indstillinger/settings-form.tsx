// src/app/(app)/indstillinger/settings-form.tsx
// OPDATERET (landsdel). Formular til at redigere profil: profilbillede (upload), navn, brugernavn, by, landsdel, erfaringsniveau og bio.

"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { updateProfile, type SettingsState } from "./actions";
import { REGIONS } from "@/lib/regions";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  city: string | null;
  region: string | null;
  experience_level: string | null;
  bio: string | null;
  avatar_url: string | null;
};

const LEVELS = [
  { value: "begynder", label: "Begynder" },
  { value: "oevet", label: "Øvet" },
  { value: "erfaren", label: "Erfaren" },
  { value: "ekspert", label: "Ekspert" },
];

const inputClass =
  "w-full rounded-lg border border-mist-100 bg-mist-50 px-3 py-2.5 text-deep-950 outline-none focus:border-deep-700 focus:bg-white";

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-700">{msg}</p> : null;
}

export default function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateProfile, {});
  const fe = state.fieldErrors ?? {};

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [bioLength, setBioLength] = useState(profile.bio?.length ?? 0);

  async function handleAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const img = await compressImage(file, 400);
      const supabase = createClient();
      const path = `${profile.id}/${crypto.randomUUID()}.${img.ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, img.blob, { contentType: img.blob.type, cacheControl: "31536000" });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
      if (dbErr) throw dbErr;

      // Slet det gamle billede, hvis det lå hos os (ikke Google)
      const marker = "/storage/v1/object/public/avatars/";
      if (avatarUrl?.includes(marker)) {
        await supabase.storage.from("avatars").remove([avatarUrl.split(marker)[1]]);
      }

      setAvatarUrl(data.publicUrl);
      router.refresh();
    } catch {
      setAvatarError("Billedet kunne ikke uploades. Prøv et JPG- eller PNG-billede.");
    } finally {
      setAvatarBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const name = profile.display_name || profile.username;

  return (
    <div className="space-y-6">
      {/* Profilbillede */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-reed-500 text-3xl font-semibold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          {avatarBusy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-deep-950/50">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </span>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={avatarBusy}
            className="flex items-center gap-2 rounded-lg bg-mist-100 px-4 py-2 text-sm font-semibold text-deep-900 hover:bg-mist-50 disabled:opacity-60"
          >
            <Camera className="h-4 w-4" aria-hidden />
            Skift profilbillede
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => handleAvatar(e.target.files?.[0])} />
          {avatarError && <p className="mt-1 text-xs text-red-700">{avatarError}</p>}
        </div>
      </div>

      {/* Oplysninger */}
      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="display_name" className="mb-1 block text-sm font-medium text-deep-900">Navn</label>
          <input id="display_name" name="display_name" defaultValue={profile.display_name} required maxLength={50} className={inputClass} />
          <FieldError msg={fe.display_name} />
        </div>

        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-deep-900">Brugernavn</label>
          <div className="flex items-center rounded-lg border border-mist-100 bg-mist-50 focus-within:border-deep-700 focus-within:bg-white">
            <span className="pl-3 text-deep-700">@</span>
            <input
              id="username"
              name="username"
              defaultValue={profile.username}
              required
              minLength={3}
              maxLength={20}
              pattern="[a-z0-9_]{3,20}"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-transparent px-1 py-2.5 text-deep-950 outline-none"
            />
          </div>
          <FieldError msg={fe.username} />
        </div>

        <div>
          <label htmlFor="city" className="mb-1 block text-sm font-medium text-deep-900">
            By <span className="font-normal text-deep-700">(valgfri)</span>
          </label>
          <input id="city" name="city" defaultValue={profile.city ?? ""} maxLength={50} className={inputClass} />
          <FieldError msg={fe.city} />
        </div>

        <div>
          <label htmlFor="region" className="mb-1 block text-sm font-medium text-deep-900">
            Landsdel <span className="font-normal text-deep-700">(valgfri)</span>
          </label>
          <select id="region" name="region" defaultValue={profile.region ?? ""} className={inputClass}>
            <option value="">Ikke valgt</option>
            {REGIONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-deep-700">
            Bruges til at vise opslag fra dit område højere i feedet. Vi gætter ud fra din by, men du kan rette det her.
          </p>
          <FieldError msg={fe.region} />
        </div>

        <div>
          <label htmlFor="experience_level" className="mb-1 block text-sm font-medium text-deep-900">Erfaringsniveau</label>
          <select id="experience_level" name="experience_level" defaultValue={profile.experience_level ?? ""} required className={inputClass}>
            <option value="" disabled>Vælg</option>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <FieldError msg={fe.experience_level} />
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block text-sm font-medium text-deep-900">
            Om mig <span className="font-normal text-deep-700">(valgfri)</span>
          </label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={profile.bio ?? ""}
            maxLength={500}
            rows={4}
            onChange={(e) => setBioLength(e.target.value.length)}
            placeholder="Hvad fisker du helst efter, og hvor?"
            className={`${inputClass} resize-y`}
          />
          <p className="mt-1 text-right text-xs text-deep-700">{bioLength}/500</p>
          <FieldError msg={fe.bio} />
        </div>

        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        {state.ok && !pending && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-reed-300/30 px-3 py-2 text-sm text-deep-900">
            <Check className="h-4 w-4" aria-hidden />
            Dine ændringer er gemt.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-deep-900 py-2.5 text-sm font-semibold text-mist-50 transition hover:bg-deep-800 disabled:opacity-60"
        >
          {pending ? "Gemmer..." : "Gem ændringer"}
        </button>
      </form>
    </div>
  );
}
