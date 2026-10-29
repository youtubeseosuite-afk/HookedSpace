// src/app/admin/medlemmer/[id]/ban-panel.tsx
// NY FIL. Admin: bortvis en bruger (1 dag, 7 dage, 30 dage eller permanent) med begrundelse, eller fjern ban'en.

"use client";

import { useActionState, useState } from "react";
import { Ban, ShieldCheck } from "lucide-react";
import { banUser, unbanUser, type BanState } from "../actions";
import { banText, dkDateTime } from "../../format";

const OPTIONS = [
  { value: "1", label: "1 dag" },
  { value: "7", label: "7 dage" },
  { value: "30", label: "30 dage" },
  { value: "perm", label: "Permanent" },
];

export default function BanPanel({
  userId,
  isBanned,
  isAdmin,
  bannedAt,
  bannedUntil,
  reason,
  bannedByName,
}: {
  userId: string;
  isBanned: boolean;
  isAdmin: boolean;
  bannedAt: string | null;
  bannedUntil: string | null;
  reason: string | null;
  bannedByName: string | null;
}) {
  const [banState, banAction, banPending] = useActionState<BanState, FormData>(banUser, {});
  const [unbanState, unbanAction, unbanPending] = useActionState<BanState, FormData>(unbanUser, {});
  const [duration, setDuration] = useState("7");
  const [changing, setChanging] = useState(false);

  const message = (s: BanState) =>
    s.error ? (
      <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">{s.error}</p>
    ) : s.ok ? (
      <p className="rounded-lg bg-reed-300/40 px-3 py-2 text-sm text-deep-950">{s.ok}</p>
    ) : null;

  if (isAdmin) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-mist-100">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-deep-900">
          <ShieldCheck className="h-4 w-4" aria-hidden /> Admin
        </h2>
        <p className="text-sm text-deep-700">Admins kan ikke bortvises herfra.</p>
      </section>
    );
  }

  const form = (
    <form action={banAction} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-deep-900">Varighed</legend>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-medium ring-1 ${
                duration === o.value
                  ? o.value === "perm"
                    ? "bg-red-600 text-white ring-red-600"
                    : "bg-deep-900 text-white ring-deep-900"
                  : "bg-white text-deep-800 ring-mist-100 hover:ring-deep-700"
              }`}
            >
              <input
                type="radio"
                name="duration"
                value={o.value}
                checked={duration === o.value}
                onChange={() => setDuration(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-deep-900">Begrundelse (brugeren kan se den)</span>
        <textarea
          name="reason"
          required
          minLength={3}
          maxLength={500}
          rows={3}
          defaultValue={isBanned ? reason ?? "" : ""}
          placeholder="F.eks. Gentagen spam i grupper"
          className="w-full rounded-lg border border-mist-100 px-3 py-2 text-sm outline-none focus:border-deep-700"
        />
      </label>
      <button
        type="submit"
        disabled={banPending}
        onClick={(e) => {
          if (duration === "perm" && !confirm("Bortvis brugeren permanent?")) e.preventDefault();
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        <Ban className="h-4 w-4" aria-hidden />
        {banPending ? "Gemmer…" : isBanned ? "Opdater ban" : "Bortvis bruger"}
      </button>
      {message(banState)}
    </form>
  );

  return (
    <section
      className={`rounded-2xl p-4 shadow-sm ring-1 ${isBanned ? "bg-red-50 ring-red-200" : "bg-white ring-mist-100"}`}
    >
      <h2 className="mb-2 flex items-center gap-2 font-semibold text-deep-900">
        <Ban className={`h-4 w-4 ${isBanned ? "text-red-600" : ""}`} aria-hidden />
        {isBanned ? "Bortvist" : "Bortvis"}
      </h2>

      {isBanned ? (
        <div className="space-y-3">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-deep-700">Varighed</dt>
              <dd className="text-right font-semibold text-red-700">{banText(bannedUntil)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-deep-700">Bortvist</dt>
              <dd className="text-right">{dkDateTime(bannedAt)}</dd>
            </div>
            {bannedByName && (
              <div className="flex justify-between gap-2">
                <dt className="text-deep-700">Af</dt>
                <dd className="text-right">{bannedByName}</dd>
              </div>
            )}
          </dl>
          {reason && <p className="rounded-lg bg-white px-3 py-2 text-sm text-deep-950 ring-1 ring-red-200">{reason}</p>}

          <form action={unbanAction}>
            <input type="hidden" name="user_id" value={userId} />
            <button
              type="submit"
              disabled={unbanPending}
              className="w-full rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-white hover:bg-deep-800 disabled:opacity-60"
            >
              {unbanPending ? "Fjerner…" : "Fjern ban"}
            </button>
          </form>
          {message(unbanState)}

          {changing ? (
            form
          ) : (
            <button onClick={() => setChanging(true)} className="w-full text-sm font-medium text-deep-700 hover:underline">
              Ændr varighed eller begrundelse
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-deep-700">
            Brugeren bliver logget ud, kan ikke logge ind, og alt brugerens indhold skjules, indtil ban&apos;en udløber.
          </p>
          {form}
          {message(unbanState)}
        </>
      )}
    </section>
  );
}
