// src/components/post-menu.tsx
// OPDATERET (Rapportér og Bloker på andres opslag). Menu (•••) på opslag. Egne opslag: "Slet opslag".
// Andres opslag: "Rapportér opslag" og "Bloker <navn>". Sletter først billederne i Storage, derefter opslaget.
// Kommentarer, reaktioner, tags og notifikationer slettes automatisk med.

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Loader2, Flag, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { blockUser } from "@/lib/blocks";
import ReportDialog from "@/components/report-dialog";

export default function PostMenu({
  postId,
  isOwner = true,
  authorId,
  authorName,
}: {
  postId: string;
  isOwner?: boolean;
  authorId?: string;
  authorName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  async function handleBlock() {
    if (!authorId) return;
    if (!window.confirm(`Bloker ${authorName ?? "brugeren"}? I kan ikke længere se hinandens opslag og kommentarer, og I holder op med at følge hinanden.`)) return;
    setError(null);
    setDeleting(true);
    const err = await blockUser(authorId);
    setDeleting(false);
    if (err) {
      setError(err);
      return;
    }
    setOpen(false);
    if (pathname.startsWith("/p/")) router.push("/feed");
    else router.refresh();
  }

  // Luk menuen ved klik udenfor
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleDelete() {
    if (!window.confirm("Vil du slette opslaget? Det kan ikke fortrydes.")) return;
    setError(null);
    setDeleting(true);
    const supabase = createClient();

    // 1) Billeder
    const { data: images, error: imgErr } = await supabase
      .from("post_images")
      .select("storage_path")
      .eq("post_id", postId);
    if (imgErr) {
      setError("Opslaget kunne ikke slettes. Prøv igen.");
      setDeleting(false);
      return;
    }
    if (images && images.length > 0) {
      const { error: rmErr } = await supabase.storage.from("post-images").remove(images.map((i) => i.storage_path));
      if (rmErr) {
        setError("Billederne kunne ikke slettes. Prøv igen.");
        setDeleting(false);
        return;
      }
    }

    // 2) Selve opslaget
    const { error: delErr } = await supabase.from("posts").delete().eq("id", postId);
    if (delErr) {
      setError("Opslaget kunne ikke slettes. Prøv igen.");
      setDeleting(false);
      return;
    }

    setOpen(false);
    if (pathname.startsWith("/p/")) {
      router.push("/feed");
    } else {
      router.refresh();
    }
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Flere valg"
        aria-expanded={open}
        disabled={deleting}
        className="flex h-8 w-8 items-center justify-center rounded-full text-deep-700 hover:bg-mist-100 disabled:opacity-50"
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-56 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-mist-100">
          {isOwner ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Slet opslag
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setReporting(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-deep-950 hover:bg-mist-50"
              >
                <Flag className="h-4 w-4" aria-hidden />
                Rapportér opslag
              </button>
              {authorId && (
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 border-t border-mist-100 px-4 py-3 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <UserX className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">Bloker {authorName ?? "brugeren"}</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {reporting && <ReportDialog targetType="post" targetId={postId} onClose={() => setReporting(false)} />}

      {error && (
        <p role="alert" className="absolute right-0 top-9 z-20 w-56 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 shadow">
          {error}
        </p>
      )}
    </div>
  );
}
