// src/app/(app)/auktioner/ny/auction-form.tsx
// NY FIL. Formular til at sætte grej på GrejAuktionen: titel, beskrivelse, kategori, stand, op til 5 billeder,
// startpris, mindste overbud, Køb nu (valgfri), varighed og afhentning/fragt.
// Billeder formindskes i browseren, og GPS-position fjernes, før de lægges op.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, Loader2, Truck, Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, type CompressedImage } from "@/lib/image";
import { AUCTION_CATEGORIES, AUCTION_CONDITIONS, AUCTION_DURATIONS } from "@/lib/auction-options";

const MAX_IMAGES = 5;

type PickedImage = CompressedImage & { id: string; previewUrl: string };

function toKr(v: string): number | null {
  const n = Number(v.replace(/\./g, "").replace(",", ".").trim());
  return v.trim() === "" || !Number.isFinite(n) ? null : Math.round(n);
}

const field = "w-full rounded-lg border border-mist-100 bg-white px-3 py-2 text-sm text-deep-950 outline-none focus:border-deep-700";
const labelCls = "mb-1 block text-sm font-medium text-deep-900";

export default function AuctionForm({ userId, defaultCity }: { userId: string; defaultCity: string | null }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [startPrice, setStartPrice] = useState("");
  const [increment, setIncrement] = useState("10");
  const [buyNow, setBuyNow] = useState("");
  const [duration, setDuration] = useState<number>(7);
  const [city, setCity] = useState(defaultCity ?? "");
  const [canShip, setCanShip] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ryd preview-URL'er op
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []);

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
        added.push({ ...c, id: crypto.randomUUID(), previewUrl: URL.createObjectURL(c.blob) });
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
      if (img) URL.revokeObjectURL(img.previewUrl);
      return cur.filter((i) => i.id !== id);
    });
  }

  function moveFirst(id: string) {
    setImages((cur) => {
      const img = cur.find((i) => i.id === id);
      return img ? [img, ...cur.filter((i) => i.id !== id)] : cur;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const t = title.trim();
    const start = toKr(startPrice);
    const inc = toKr(increment);
    const bn = toKr(buyNow);

    if (t.length < 3) return setError("Skriv en titel (mindst 3 tegn).");
    if (!category) return setError("Vælg en kategori.");
    if (!condition) return setError("Vælg hvilken stand grejet er i.");
    if (images.length === 0) return setError("Tilføj mindst ét billede. Auktioner med billeder får langt flere bud.");
    if (start == null || start < 0) return setError("Skriv en startpris i hele kroner.");
    if (start > 1_000_000) return setError("Startprisen er for høj.");
    if (inc == null || inc < 1) return setError("Mindste overbud skal være mindst 1 kr.");
    if (bn != null && bn <= start) return setError("Køb nu-prisen skal være højere end startprisen.");
    if (!accepted) return setError("Du skal bekræfte, at du ejer grejet og følger reglerne.");

    setSubmitting(true);
    const supabase = createClient();

    const { data: auction, error: insErr } = await supabase
      .from("auctions")
      .insert({
        seller_id: userId,
        title: t,
        description: description.trim() || null,
        category,
        condition,
        start_price: start,
        min_increment: inc,
        buy_now_price: bn,
        duration_days: duration,
        city: city.trim() || null,
        can_ship: canShip,
      })
      .select("id")
      .single();

    if (insErr || !auction) {
      setError("Auktionen kunne ikke oprettes. Prøv igen.");
      setSubmitting(false);
      return;
    }

    const uploaded: string[] = [];
    try {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const path = `${userId}/${auction.id}/${i}-${crypto.randomUUID()}.${img.ext}`;
        const { error: upErr } = await supabase.storage
          .from("auction-images")
          .upload(path, img.blob, { contentType: img.blob.type, cacheControl: "31536000" });
        if (upErr) throw upErr;
        uploaded.push(path);
        const { error: rowErr } = await supabase.from("auction_images").insert({
          auction_id: auction.id,
          user_id: userId,
          storage_path: path,
          width: img.width,
          height: img.height,
          position: i,
        });
        if (rowErr) throw rowErr;
      }
    } catch {
      // Ryd op, så der ikke ligger en halv auktion
      if (uploaded.length) await supabase.storage.from("auction-images").remove(uploaded);
      await supabase.rpc("cancel_auction", { p_auction: auction.id });
      setError("Billederne kunne ikke gemmes. Prøv igen.");
      setSubmitting(false);
      return;
    }

    router.push(`/auktioner/${auction.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Billeder */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
        <h2 className="mb-1 font-semibold text-deep-900">Billeder</h2>
        <p className="mb-3 text-sm text-deep-700">Op til {MAX_IMAGES} billeder. Det første bliver forsidebilledet. Tryk på et billede for at gøre det til forsidebillede.</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((img, i) => (
            <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-mist-100">
              <button type="button" onClick={() => moveFirst(img.id)} className="h-full w-full" aria-label="Gør til forsidebillede">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-deep-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-mist-50">Forside</span>
              )}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label="Fjern billede"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-deep-950/70 text-white hover:bg-deep-950"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={processing}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-mist-100 text-deep-700 hover:border-deep-700 disabled:opacity-60"
            >
              {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" aria-hidden />}
              <span className="text-xs">
                {images.length}/{MAX_IMAGES}
              </span>
            </button>
          )}
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      </section>

      {/* Beskrivelse */}
      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
        <div>
          <label htmlFor="title" className={labelCls}>
            Titel
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Fx Shimano Stradic 3000 FL med ekstra spole"
            className={field}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className={labelCls}>
              Kategori
            </label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
              <option value="">Vælg kategori</option>
              {AUCTION_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={labelCls}>Stand</span>
            <div className="flex flex-wrap gap-1.5">
              {AUCTION_CONDITIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCondition(c.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${
                    condition === c.key ? "bg-deep-900 text-white ring-deep-900" : "bg-white text-deep-800 ring-mist-100 hover:ring-deep-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="description" className={labelCls}>
            Beskrivelse
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={3000}
            rows={5}
            placeholder="Model, størrelse, hvor meget det er brugt, eventuelle fejl, og hvad der følger med."
            className={field}
          />
          <p className="mt-1 text-right text-xs text-deep-700">{description.length}/3000</p>
        </div>
      </section>

      {/* Pris og varighed */}
      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
        <h2 className="font-semibold text-deep-900">Pris og varighed</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="start" className={labelCls}>
              Startpris (kr.)
            </label>
            <input id="start" inputMode="numeric" value={startPrice} onChange={(e) => setStartPrice(e.target.value)} placeholder="Fx 200" className={field} />
          </div>
          <div>
            <label htmlFor="inc" className={labelCls}>
              Mindste overbud (kr.)
            </label>
            <input id="inc" inputMode="numeric" value={increment} onChange={(e) => setIncrement(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="buynow" className={labelCls}>
              Køb nu-pris (valgfri)
            </label>
            <input id="buynow" inputMode="numeric" value={buyNow} onChange={(e) => setBuyNow(e.target.value)} placeholder="Fx 600" className={field} />
          </div>
        </div>
        <p className="text-xs text-deep-700">
          Med Køb nu kan en køber købe grejet med det samme til den pris, så længe ingen har budt højere.
        </p>
        <div>
          <span className={labelCls}>Varighed</span>
          <div className="flex flex-wrap gap-1.5">
            {AUCTION_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ring-1 ${
                  duration === d ? "bg-deep-900 text-white ring-deep-900" : "bg-white text-deep-800 ring-mist-100 hover:ring-deep-700"
                }`}
              >
                {d} dage
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Afhentning */}
      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
        <h2 className="font-semibold text-deep-900">Afhentning og fragt</h2>
        <div>
          <label htmlFor="city" className={labelCls}>
            By
          </label>
          <input id="city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={50} placeholder="Hvor kan grejet hentes?" className={field} />
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-deep-900">
          <input type="checkbox" checked={canShip} onChange={(e) => setCanShip(e.target.checked)} className="h-4 w-4 accent-deep-900" />
          <Truck className="h-4 w-4 text-deep-700" aria-hidden /> Jeg kan sende grejet (køber betaler fragt)
        </label>
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 text-sm text-deep-900 shadow-sm ring-1 ring-mist-100">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-deep-900" />
        <span>
          Jeg ejer grejet, det er lovligt at sælge, og jeg vil sælge til den, der vinder auktionen. Jeg ved, at FiskoMan ikke er part i
          handlen, og at køber og jeg selv aftaler betaling og afhentning.
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || processing}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-lure-400 px-4 py-3 text-base font-bold text-deep-950 hover:bg-lure-500 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gavel className="h-5 w-5" aria-hidden />}
        {submitting ? "Opretter auktion…" : "Start auktionen"}
      </button>
      <p className="text-center text-xs text-deep-700">Når auktionen er startet, kan den kun trækkes tilbage, så længe ingen har budt.</p>
    </form>
  );
}
