// src/app/(app)/indstillinger/delete-account.tsx
// OPDATERET (visuel sletningslog trin for trin). "Slet min konto": tæller brugerens data, sletter billeder i Storage,
// sletter derefter kontoen (profil, opslag, kommentarer, reaktioner, følgere, badges og notifikationer følger med)
// og logger ud. Hvert trin vises i en log med antal og status.

"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Check, X, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_WORD = "SLET";

type StepStatus = "pending" | "running" | "done" | "error";
type Step = { key: string; label: string; doneLabel: string; status: StepStatus; detail?: string };

const INITIAL_STEPS: Step[] = [
  { key: "scan", label: "Finder dine data", doneLabel: "Dine data er fundet", status: "pending" },
  { key: "postImages", label: "Sletter billeder fra opslag", doneLabel: "Billeder fra opslag slettet", status: "pending" },
  { key: "avatars", label: "Sletter profilbilleder", doneLabel: "Profilbilleder slettet", status: "pending" },
  { key: "content", label: "Sletter opslag, kommentarer og reaktioner", doneLabel: "Opslag, kommentarer og reaktioner slettet", status: "pending" },
  { key: "social", label: "Sletter følgere, badges og notifikationer", doneLabel: "Følgere, badges og notifikationer slettet", status: "pending" },
  { key: "profile", label: "Sletter profil og login", doneLabel: "Profil og login slettet", status: "pending" },
  { key: "signout", label: "Logger dig ud", doneLabel: "Du er logget ud", status: "pending" },
];

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

async function removeInChunks(supabase: ReturnType<typeof createClient>, bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-deep-700" aria-hidden />;
    case "done":
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-reed-500 text-white">
          <Check className="h-3 w-3" aria-hidden />
        </span>
      );
    case "error":
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white">
          <X className="h-3 w-3" aria-hidden />
        </span>
      );
    default:
      return <Circle className="h-4 w-4 text-deep-700/30" aria-hidden />;
  }
}

function DeletionLog({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-mist-100" aria-live="polite">
      {steps.map((s) => (
        <li key={s.key} className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0">
            <StepIcon status={s.status} />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`block text-sm ${
                s.status === "pending"
                  ? "text-deep-700/50"
                  : s.status === "error"
                    ? "font-medium text-red-700"
                    : "font-medium text-deep-900"
              }`}
            >
              {s.status === "done" ? s.doneLabel : s.label}
            </span>
            {s.detail && <span className="block text-xs text-deep-700">{s.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);

  function update(key: string, status: StepStatus, detail?: string) {
    setSteps((cur) => cur.map((s) => (s.key === key ? { ...s, status, detail: detail ?? s.detail } : s)));
  }

  async function handleDelete() {
    if (confirm !== CONFIRM_WORD || running) return;
    setRunning(true);
    setFailed(false);
    setSteps(INITIAL_STEPS);
    const supabase = createClient();
    let current = "scan";

    try {
      // 1) Find data
      update("scan", "running");
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error("Ikke logget ind");
      const uid = userData.user.id;

      const paths: string[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("post_images")
          .select("storage_path")
          .eq("user_id", uid)
          .range(from, from + 999);
        if (error) throw error;
        paths.push(...(data ?? []).map((r) => r.storage_path));
        if (!data || data.length < 1000) break;
      }
      const { data: avatars, error: listErr } = await supabase.storage.from("avatars").list(uid, { limit: 1000 });
      if (listErr) throw listErr;
      const avatarPaths = (avatars ?? []).map((f) => `${uid}/${f.name}`);

      const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
      const [posts, comments, reactions, following, followers, badges, notifications] = await Promise.all([
        count(supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", uid)),
        count(supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("user_id", uid)),
        count(supabase.from("post_reactions").select("post_id", { count: "exact", head: true }).eq("user_id", uid)),
        count(supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("follower_id", uid)),
        count(supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", uid)),
        count(supabase.from("user_badges").select("badge_id", { count: "exact", head: true }).eq("user_id", uid)),
        count(supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid)),
      ]);
      update(
        "scan",
        "done",
        `${plural(posts, "opslag", "opslag")}, ${plural(paths.length + avatarPaths.length, "billede", "billeder")}, ${plural(comments, "kommentar", "kommentarer")}`
      );

      // 2) Billeder fra opslag
      current = "postImages";
      update("postImages", "running", `0 af ${paths.length}`);
      for (let i = 0; i < paths.length; i += 100) {
        await removeInChunks(supabase, "post-images", paths.slice(i, i + 100));
        update("postImages", "running", `${Math.min(i + 100, paths.length)} af ${paths.length}`);
      }
      update("postImages", "done", paths.length === 0 ? "Ingen billeder" : plural(paths.length, "billede", "billeder"));

      // 3) Profilbilleder
      current = "avatars";
      update("avatars", "running");
      await removeInChunks(supabase, "avatars", avatarPaths);
      update(
        "avatars",
        "done",
        avatarPaths.length === 0 ? "Intet profilbillede gemt hos os" : plural(avatarPaths.length, "billede", "billeder")
      );

      // 4–6) Kontoen. Alt slettes i én samlet handling i databasen, så intet bliver halvt slettet.
      current = "content";
      update("content", "running");
      update("social", "running");
      update("profile", "running");
      const { error: rpcErr } = await supabase.rpc("delete_my_account");
      if (rpcErr) {
        update("social", "pending");
        update("profile", "pending");
        throw rpcErr;
      }
      update(
        "content",
        "done",
        `${plural(posts, "opslag", "opslag")}, ${plural(comments, "kommentar", "kommentarer")}, ${plural(reactions, "reaktion", "reaktioner")}`
      );
      update(
        "social",
        "done",
        `${plural(following + followers, "forbindelse", "forbindelser")}, ${plural(badges, "badge", "badges")}, ${plural(notifications, "notifikation", "notifikationer")}`
      );
      update("profile", "done", "Din konto findes ikke længere");

      // 7) Log ud
      current = "signout";
      update("signout", "running");
      await supabase.auth.signOut();
      update("signout", "done");

      setFinished(true);
    } catch {
      update(current, "error", "Det lykkedes ikke. Prøv igen, eller skriv til os.");
      setFailed(true);
      setRunning(false);
    }
  }

  // ---------- Færdig ----------
  if (finished) {
    return (
      <div className="space-y-3">
        <DeletionLog steps={steps} />
        <div className="rounded-xl bg-reed-300/30 p-4 text-sm text-deep-900">
          <p className="font-semibold">Din konto er slettet.</p>
          <p className="mt-1">Tak fordi du var med på HookedSpace. Knæk og bræk!</p>
        </div>
        <a
          href="/"
          className="inline-block rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800"
        >
          Til forsiden
        </a>
      </div>
    );
  }

  // ---------- Knap ----------
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
      >
        Slet min konto
      </button>
    );
  }

  // ---------- Bekræft / i gang ----------
  return (
    <div className="space-y-3 rounded-xl bg-red-50 p-4">
      {!running && !failed && (
        <>
          <p className="flex items-start gap-2 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Din profil, alle dine opslag og billeder, kommentarer, reaktioner, følgere, badges og notifikationer
              bliver slettet med det samme. Det kan ikke fortrydes.
            </span>
          </p>
          <div>
            <label htmlFor="confirm-delete" className="mb-1 block text-sm font-medium text-red-900">
              Skriv <strong>{CONFIRM_WORD}</strong> for at bekræfte
            </label>
            <input
              id="confirm-delete"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.toUpperCase())}
              autoComplete="off"
              className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-deep-950 outline-none focus:border-red-500"
            />
          </div>
        </>
      )}

      {(running || failed) && <DeletionLog steps={steps} />}

      <div className="flex flex-wrap gap-2">
        {!running && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={confirm !== CONFIRM_WORD}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-40"
          >
            {failed ? "Prøv igen" : "Slet min konto permanent"}
          </button>
        )}
        {!running && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirm("");
              setFailed(false);
              setSteps(INITIAL_STEPS);
            }}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-deep-700 hover:bg-white"
          >
            Annuller
          </button>
        )}
        {running && (
          <p className="flex items-center gap-2 text-sm font-medium text-red-800">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Sletter... luk ikke siden
          </p>
        )}
      </div>
    </div>
  );
}
