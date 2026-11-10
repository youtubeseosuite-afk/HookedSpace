// src/app/(app)/post/ny/post-form.tsx
// OPDATERET (bruges også til at redigere et opslag). Opslagsformularen: tekst, op til 5 billeder, følelse, sted, tag venner, valgfri fangstdetaljer og synlighed.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, UserPlus, Smile, MapPin, Fish, X, Globe, Users, Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, type CompressedImage } from "@/lib/image";
import { FEELINGS, getFeeling, type FeelingKey } from "@/lib/feelings";

export type Species = { id: number; name: string; water_type: "salt" | "fersk" | "begge" };
export type PostGroup = { id: string; slug: string; name: string; privacy: "public" | "private" };
export type Friend = { id: string; username: string; display_name: string | null; avatar_url: string | null };

type Panel = "feeling" | "location" | "tags" | "catch" | null;
type Visibility = "public" | "followers" | "private";
type NewImage = CompressedImage & { kind: "new"; id: string; previewUrl: string };
type OldImage = { kind: "old"; id: string; storagePath: string; previewUrl: string; width: number | null; height: number | null };
type PickedImage = NewImage | OldImage;

// Et eksisterende opslag, der redigeres
export type EditablePost = {
  id: string;
  body: string | null;
  feeling: FeelingKey | null;
  location_name: string | null;
  visibility: Visibility;
  species_id: number | null;
  weight_kg: number | null;
  length_cm: number | null;
  released: boolean | null;
  is_trophy: boolean;
  images: { id: string; storage_path: string; url: string; width: number | null; height: number | null }[];
  tagged: string[];
};

const MAX_IMAGES = 5;

const VISIBILITY: { value: Visibility; label: string; icon: typeof Globe; hint: string }[] = [
  { value: "public", label: "Offentlig", icon: Globe, hint: "Alle kan se det, også uden login og via delte links" },
  { value: "followers", label: "Følgere", icon: Users, hint: "Kun dem der følger dig" },
  { value: "private", label: "Kun mig", icon: Lock, hint: "Kun dig" },
];

function Avatar({ name, url, size = "h-10 w-10" }: { name: string; url: string | null; size?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover`} referrerPolicy="no-referrer" />;
  }
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-reed-500 text-sm font-semibold text-white`}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function parseDecimal(v: string): number | null {
  const n = Number(v.replace(",", ".").trim());
  return v.trim() === "" || Number.isNaN(n) || n <= 0 ? null : n;
}

export default function PostForm({
  userId,
  displayName,
  avatarUrl,
  species,
  friends,
  group = null,
  existing = null,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  species: Species[];
  friends: Friend[];
  group?: PostGroup | null;
  existing?: EditablePost | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const fmt = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));
  const [body, setBody] = useState(existing?.body ?? "");
  const [images, setImages] = useState<PickedImage[]>(
    (existing?.images ?? []).map((i) => ({
      kind: "old" as const,
      id: i.id,
      storagePath: i.storage_path,
      previewUrl: i.url,
      width: i.width,
      height: i.height,
    }))
  );
  const [processing, setProcessing] = useState(false);
  const [feeling, setFeeling] = useState<FeelingKey | null>(existing?.feeling ?? null);
  const [location, setLocation] = useState(existing?.location_name ?? "");
  const [tagged, setTagged] = useState<string[]>(existing?.tagged ?? []);
  const [friendSearch, setFriendSearch] = useState("");
  const [visibility, setVisibility] = useState<Visibility>(existing?.visibility ?? "public");
  const [panel, setPanel] = useState<Panel>(null);

  const [isCatch, setIsCatch] = useState(Boolean(existing?.species_id));
  const [speciesId, setSpeciesId] = useState(existing?.species_id ? String(existing.species_id) : "");
  const [weight, setWeight] = useState(fmt(existing?.weight_kg ?? null));
  const [length, setLength] = useState(fmt(existing?.length_cm ?? null));
  const [released, setReleased] = useState<"" | "ja" | "nej">(
    existing?.released == null ? "" : existing.released ? "ja" : "nej"
  );
  const [isTrophy, setIsTrophy] = useState(existing?.is_trophy ?? false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ryd preview-URL'er op når komponenten forsvinder
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((i) => i.kind === "new" && URL.revokeObjectURL(i.previewUrl)), []);

  const feelingObj = getFeeling(feeling);
  const taggedFriends = friends.filter((f) => tagged.includes(f.id));
  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) => (f.display_name ?? "").toLowerCase().includes(q) || f.username.toLowerCase().includes(q)
    );
  }, [friends, friendSearch]);

  const speciesGroups = useMemo(
    () => [
      { label: "Ferskvand", items: species.filter((s) => s.water_type === "fersk") },
      { label: "Saltvand", items: species.filter((s) => s.water_type === "salt") },
      { label: "Begge", items: species.filter((s) => s.water_type === "begge") },
    ],
    [species]
  );

  function togglePanel(p: Panel) {
    setPanel((cur) => (cur === p ? null : p));
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const room = MAX_IMAGES - images.length;
    const files = Array.from(fileList).slice(0, room);
    if (fileList.length > room) setError(`Du kan højst tilføje ${MAX_IMAGES} billeder.`);

    setProcessing(true);
    const added: PickedImage[] = [];
    for (const file of files) {
      try {
        const c = await compressImage(file);
        added.push({ ...c, kind: "new", id: crypto.randomUUID(), previewUrl: URL.createObjectURL(c.blob) });
      } catch {
        setError("Et af billederne kunne ikke læses. Prøv et JPG- eller PNG-billede.");
      }
    }
    setImages((cur) => [...cur, ...added].slice(0, MAX_IMAGES));
    setProcessing(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  function removeImage(id: string) {
    setImages((cur) => {
      const img = cur.find((i) => i.id === id);
      if (img?.kind === "new") URL.revokeObjectURL(img.previewUrl);
      return cur.filter((i) => i.id !== id);
    });
  }

  function toggleTag(id: string) {
    setTagged((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]));
  }

  async function handleSubmit() {
    setError(null);
    const text = body.trim();
    if (!text && images.length === 0) {
      setError("Skriv noget eller tilføj et billede.");
      return;
    }
    if (isCatch && !speciesId) {
      setError("Vælg en art, eller slå fangst fra.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    if (existing) {
      await saveChanges(supabase, existing, text);
      return;
    }

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        body: text || null,
        feeling,
        location_name: location.trim() || null,
        visibility: group ? "public" : visibility,
        group_id: group ? group.id : null,
        species_id: isCatch ? Number(speciesId) : null,
        weight_kg: isCatch ? parseDecimal(weight) : null,
        length_cm: isCatch ? parseDecimal(length) : null,
        released: isCatch && released !== "" ? released === "ja" : null,
        is_trophy: isCatch ? isTrophy : false,
      })
      .select("id")
      .single();

    if (postError || !post) {
      setError("Opslaget kunne ikke gemmes. Prøv igen.");
      setSubmitting(false);
      return;
    }

    const uploadedPaths: string[] = [];
    try {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.kind !== "new") continue;
        const path = `${userId}/${post.id}/${i}-${crypto.randomUUID()}.${img.ext}`;
        const { error: upErr } = await supabase.storage
          .from("post-images")
          .upload(path, img.blob, { contentType: img.blob.type, cacheControl: "31536000" });
        if (upErr) throw upErr;
        uploadedPaths.push(path);

        const { error: rowErr } = await supabase.from("post_images").insert({
          post_id: post.id,
          user_id: userId,
          storage_path: path,
          width: img.width,
          height: img.height,
          position: i,
        });
        if (rowErr) throw rowErr;
      }

      if (tagged.length > 0) {
        const { error: tagErr } = await supabase
          .from("post_tags")
          .insert(tagged.map((tagged_user_id) => ({ post_id: post.id, tagged_user_id })));
        if (tagErr) throw tagErr;
      }
    } catch {
      // Ryd op, så der ikke ligger halve opslag
      if (uploadedPaths.length) await supabase.storage.from("post-images").remove(uploadedPaths);
      await supabase.from("posts").delete().eq("id", post.id);
      setError("Billeder eller tags kunne ikke gemmes. Prøv igen.");
      setSubmitting(false);
      return;
    }

    router.push(group ? `/g/${group.slug}` : "/feed");
    router.refresh();
  }

  // Gem ændringer i et eksisterende opslag
  async function saveChanges(supabase: ReturnType<typeof createClient>, post: EditablePost, text: string) {
    const postId = post.id;

    const { error: updErr } = await supabase
      .from("posts")
      .update({
        body: text || null,
        feeling,
        location_name: location.trim() || null,
        ...(group ? {} : { visibility }),
        species_id: isCatch ? Number(speciesId) : null,
        weight_kg: isCatch ? parseDecimal(weight) : null,
        length_cm: isCatch ? parseDecimal(length) : null,
        released: isCatch && released !== "" ? released === "ja" : null,
        is_trophy: isCatch ? isTrophy : false,
        edited_at: new Date().toISOString(),
      })
      .eq("id", postId);
    if (updErr) {
      setError("Ændringerne kunne ikke gemmes. Prøv igen.");
      setSubmitting(false);
      return;
    }

    // Billeder: kun hvis noget er fjernet, tilføjet eller flyttet
    const before = post.images.map((i) => i.id).join(",");
    const after = images.map((i) => i.id).join(",");
    if (before !== after) {
      const removed = post.images.filter((o) => !images.some((i) => i.kind === "old" && i.id === o.id));
      const uploaded = new Map<string, string>();
      try {
        for (const img of images) {
          if (img.kind !== "new") continue;
          const path = `${userId}/${postId}/${crypto.randomUUID()}.${img.ext}`;
          const { error: upErr } = await supabase.storage
            .from("post-images")
            .upload(path, img.blob, { contentType: img.blob.type, cacheControl: "31536000" });
          if (upErr) throw upErr;
          uploaded.set(img.id, path);
        }
        // Byg billedlisten op igen i den nye rækkefølge
        const { error: delErr } = await supabase.from("post_images").delete().eq("post_id", postId);
        if (delErr) throw delErr;
        if (images.length > 0) {
          const { error: insErr } = await supabase.from("post_images").insert(
            images.map((img, i) => ({
              post_id: postId,
              user_id: userId,
              storage_path: img.kind === "old" ? img.storagePath : uploaded.get(img.id)!,
              width: img.width,
              height: img.height,
              position: i,
            }))
          );
          if (insErr) throw insErr;
        }
      } catch {
        if (uploaded.size) await supabase.storage.from("post-images").remove([...uploaded.values()]);
        setError("Billederne kunne ikke gemmes. Prøv igen.");
        setSubmitting(false);
        router.refresh();
        return;
      }
      if (removed.length) await supabase.storage.from("post-images").remove(removed.map((r) => r.storage_path));
    }

    // Tags: tilføj nye og fjern dem, der er fjernet
    const addTags = tagged.filter((t) => !post.tagged.includes(t));
    const removeTags = post.tagged.filter((t) => !tagged.includes(t));
    if (addTags.length) {
      await supabase.from("post_tags").insert(addTags.map((tagged_user_id) => ({ post_id: postId, tagged_user_id })));
    }
    if (removeTags.length) {
      await supabase.from("post_tags").delete().eq("post_id", postId).in("tagged_user_id", removeTags);
    }

    router.push(`/p/${postId}`);
    router.refresh();
  }

  const toolButton = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      active ? "bg-deep-900 text-mist-50" : "text-deep-800 hover:bg-mist-100"
    }`;

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
      {/* Top: avatar, navn og synlighed */}
      <div className="flex items-center gap-3 p-4">
        <Avatar name={displayName} url={avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-deep-950">
            <span className="font-semibold">{displayName}</span>
            {feelingObj && (
              <span className="text-deep-700">
                {" "}føler sig {feelingObj.emoji} <span className="font-medium text-deep-900">{feelingObj.label}</span>
              </span>
            )}
            {taggedFriends.length > 0 && (
              <span className="text-deep-700">
                {" "}med <span className="font-medium text-deep-900">{taggedFriends.map((f) => f.display_name ?? f.username).join(", ")}</span>
              </span>
            )}
            {location.trim() && (
              <span className="text-deep-700">
                {" "}ved <span className="font-medium text-deep-900">{location.trim()}</span>
              </span>
            )}
          </p>
          {group ? (
            <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-deep-900 px-2 py-0.5 text-xs font-medium text-mist-50">
              {group.privacy === "private" ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <Globe className="h-3.5 w-3.5" aria-hidden />}
              I gruppen <span className="font-semibold text-lure-400">{group.name}</span>
            </p>
          ) : (
          <div className="mt-1 inline-flex rounded-md bg-mist-100 p-0.5">
            {VISIBILITY.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                  visibility === value ? "bg-white text-deep-900 shadow-sm" : "text-deep-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          )}
          {!group && (
            <p className="mt-1 text-xs text-deep-700">{VISIBILITY.find((v) => v.value === visibility)?.hint}</p>
          )}
        </div>
      </div>

      {/* Tekst */}
      <div className="px-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={4}
          placeholder={`Hvad sker der ved vandet, ${displayName.split(" ")[0]}?`}
          className="w-full resize-y border-0 bg-transparent text-lg text-deep-950 outline-none placeholder:text-deep-700/60"
        />
      </div>

      {/* Billeder */}
      {(images.length > 0 || processing) && (
        <div className="grid grid-cols-3 gap-2 px-4 pb-2 sm:grid-cols-5">
          {images.map((img) => (
            <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-mist-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label="Fjern billede"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-deep-950/70 text-white hover:bg-deep-950"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {processing && (
            <div className="flex aspect-square items-center justify-center rounded-lg bg-mist-100">
              <Loader2 className="h-6 w-6 animate-spin text-deep-700" />
            </div>
          )}
        </div>
      )}

      {/* Paneler */}
      {panel === "feeling" && (
        <div className="mx-4 mb-2 grid grid-cols-2 gap-2 rounded-xl bg-mist-50 p-3 sm:grid-cols-5">
          {FEELINGS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFeeling(feeling === f.key ? null : f.key);
                setPanel(null);
              }}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${
                feeling === f.key ? "bg-deep-900 text-mist-50" : "bg-white text-deep-900 hover:bg-mist-100"
              }`}
            >
              <span className="text-lg">{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {panel === "location" && (
        <div className="mx-4 mb-2 rounded-xl bg-mist-50 p-3">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={100}
            placeholder="fx Gudenåen, Lillebælt eller Kolding Fjord"
            className="w-full rounded-lg border border-mist-100 bg-white px-3 py-2 text-deep-950 outline-none focus:border-deep-700"
          />
          <p className="mt-2 text-xs text-deep-700">
            Skriv gerne et område frem for din præcise plads. Dine hemmelige spots er dine egne.
          </p>
        </div>
      )}

      {panel === "tags" && (
        <div className="mx-4 mb-2 rounded-xl bg-mist-50 p-3">
          {friends.length === 0 ? (
            <p className="text-sm text-deep-700">
              Du har ingen venner endnu. Venner er dem, du følger, som også følger dig.
            </p>
          ) : (
            <>
              <input
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Søg i dine venner"
                className="mb-2 w-full rounded-lg border border-mist-100 bg-white px-3 py-2 text-deep-950 outline-none focus:border-deep-700"
              />
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {filteredFriends.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => toggleTag(f.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left ${
                        tagged.includes(f.id) ? "bg-deep-900 text-mist-50" : "bg-white text-deep-900 hover:bg-mist-100"
                      }`}
                    >
                      <Avatar name={f.display_name ?? f.username} url={f.avatar_url} size="h-8 w-8" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-medium">{f.display_name ?? f.username}</span>{" "}
                        <span className="opacity-70">@{f.username}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {panel === "catch" && (
        <div className="mx-4 mb-2 space-y-3 rounded-xl bg-mist-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-deep-900">
            <input type="checkbox" checked={isCatch} onChange={(e) => setIsCatch(e.target.checked)} className="h-4 w-4 accent-deep-900" />
            Dette opslag er en fangst
          </label>

          {isCatch && (
            <>
              <select
                value={speciesId}
                onChange={(e) => setSpeciesId(e.target.value)}
                className="w-full rounded-lg border border-mist-100 bg-white px-3 py-2 text-deep-950 outline-none focus:border-deep-700"
              >
                <option value="">Vælg art</option>
                {speciesGroups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.items.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  inputMode="decimal"
                  placeholder="Vægt (kg)"
                  className="rounded-lg border border-mist-100 bg-white px-3 py-2 text-deep-950 outline-none focus:border-deep-700"
                />
                <input
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  inputMode="decimal"
                  placeholder="Længde (cm)"
                  className="rounded-lg border border-mist-100 bg-white px-3 py-2 text-deep-950 outline-none focus:border-deep-700"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-deep-900">
                <span className="font-medium">Genudsat?</span>
                {(["ja", "nej"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="released"
                      checked={released === v}
                      onChange={() => setReleased(v)}
                      className="accent-deep-900"
                    />
                    {v === "ja" ? "Ja" : "Nej"}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-deep-900">
                <input type="checkbox" checked={isTrophy} onChange={(e) => setIsTrophy(e.target.checked)} className="h-4 w-4 accent-deep-900" />
                Sæt på min trofævæg
              </label>
            </>
          )}
        </div>
      )}

      {/* Værktøjslinje */}
      <div className="mx-4 flex flex-wrap items-center gap-1 border-t border-mist-100 py-2">
        <span className="mr-2 hidden text-sm font-medium text-deep-700 sm:inline">Tilføj:</span>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={images.length >= MAX_IMAGES || processing}
          className={`${toolButton(false)} disabled:opacity-40`}
        >
          <ImagePlus className="h-5 w-5 text-reed-500" aria-hidden />
          <span>Billeder</span>
          <span className="text-xs text-deep-700">
            {images.length}/{MAX_IMAGES}
          </span>
        </button>
        <button type="button" onClick={() => togglePanel("tags")} className={toolButton(panel === "tags")}>
          <UserPlus className="h-5 w-5" aria-hidden />
          <span>Tag venner</span>
        </button>
        <button type="button" onClick={() => togglePanel("feeling")} className={toolButton(panel === "feeling")}>
          <Smile className="h-5 w-5" aria-hidden />
          <span>Følelse</span>
        </button>
        <button type="button" onClick={() => togglePanel("location")} className={toolButton(panel === "location")}>
          <MapPin className="h-5 w-5" aria-hidden />
          <span>Sted</span>
        </button>
        <button type="button" onClick={() => togglePanel("catch")} className={toolButton(panel === "catch" || isCatch)}>
          <Fish className="h-5 w-5" aria-hidden />
          <span>Fangst</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p role="alert" className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || processing}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-deep-900 py-2.5 text-sm font-semibold text-mist-50 transition hover:bg-deep-800 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {existing ? (submitting ? "Gemmer..." : "Gem ændringer") : submitting ? "Deler..." : "Del opslag"}
        </button>
      </div>
    </div>
  );
}
