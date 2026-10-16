// src/components/photo-gallery.tsx
// NY FIL. Billedgalleri: gitter med miniaturer. Klik åbner billedet i stor visning med bladring
// (pile, swipe på mobil, piletaster og Esc) og et link til det opslag, billedet kommer fra.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, ExternalLink, Images } from "lucide-react";

export type GalleryImage = {
  url: string;
  postId: string;
  width: number | null;
  height: number | null;
};

export default function PhotoGallery({
  images,
  nextHref,
  emptyText,
}: {
  images: GalleryImage[];
  nextHref: string | null;
  emptyText: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(() => setIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length)), [images.length]);
  const next = useCallback(() => setIndex((i) => (i === null ? i : (i + 1) % images.length)), [images.length]);

  // Tastatur og lås af baggrunden mens billedet er åbent
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, close, prev, next]);

  if (images.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-mist-100">
        <Images className="mx-auto h-10 w-10 text-reed-500" aria-hidden />
        <p className="mt-3 text-sm text-deep-700">{emptyText}</p>
      </div>
    );
  }

  const current = index !== null ? images[index] : null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl">
        {images.map((img, i) => (
          <li key={`${img.url}-${i}`}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Vis billede ${i + 1}`}
              className="block aspect-square w-full overflow-hidden bg-mist-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-lure-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
            </button>
          </li>
        ))}
      </ul>

      {nextHref && (
        <div className="flex justify-center pt-2">
          <Link
            href={nextHref}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-deep-900 shadow-sm ring-1 ring-mist-100 hover:bg-mist-50"
          >
            Vis flere billeder
          </Link>
        </div>
      )}

      {/* Stor visning */}
      {current && index !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Billede"
          className="fixed inset-0 z-50 flex flex-col bg-deep-950/95"
          onClick={close}
          onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (dx > 50) prev();
            if (dx < -50) next();
            touchStartX.current = null;
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-mist-50" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-medium">
              {index + 1} / {images.length}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/p/${current.postId}`}
                className="flex items-center gap-1.5 rounded-lg bg-deep-800 px-3 py-1.5 text-sm font-semibold hover:bg-deep-700"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Se opslaget
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Luk"
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-deep-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  aria-label="Forrige billede"
                  className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-deep-900/70 text-mist-50 hover:bg-deep-800"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  aria-label="Næste billede"
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-deep-900/70 text-mist-50 hover:bg-deep-800"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
