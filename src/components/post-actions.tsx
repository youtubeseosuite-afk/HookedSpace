// src/components/post-actions.tsx
// OPDATERET (Rapportér på andres kommentarer). Bunden af et opslag: "Knæk og bræk"-reaktion, antal, kommentarer og deling.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Send, Trash2, Loader2, Share2, Check, Repeat2, Link2, Flag } from "lucide-react";
import ReportDialog from "@/components/report-dialog";
import { createClient } from "@/lib/supabase/client";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

const COMMENT_SELECT =
  "id, body, created_at, user_id, author:profiles!post_comments_user_id_fkey ( username, display_name, avatar_url )";

function shortTime(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "nu";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} t`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", timeZone: "Europe/Copenhagen" });
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />;
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-reed-500 text-xs font-semibold text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

type Visibility = "public" | "followers" | "private";

export default function PostActions({
  postId,
  shareTargetId,
  postOwnerId,
  viewerId,
  initialReacted,
  initialReactionCount,
  initialCommentCount,
  shareable,
}: {
  postId: string;
  shareTargetId: string; // det opslag der deles (originalen, hvis dette selv er en deling)
  postOwnerId: string;
  viewerId: string | null;
  initialReacted: boolean;
  initialReactionCount: number;
  initialCommentCount: number;
  shareable: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [shareMenu, setShareMenu] = useState(false);
  const [composer, setComposer] = useState(false);
  const [shareText, setShareText] = useState("");
  const [shareVisibility, setShareVisibility] = useState<Visibility>("public");
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  function onShareClick() {
    // Ikke logget ind: kun link-deling
    if (!viewerId) {
      shareLink();
      return;
    }
    setShareMenu((v) => !v);
    setComposer(false);
    setShareError(null);
  }

  async function shareToFeed() {
    if (!viewerId || sharing) return;
    setSharing(true);
    setShareError(null);
    const supabase = createClient();
    const { error } = await supabase.from("posts").insert({
      user_id: viewerId,
      body: shareText.trim() || null,
      visibility: shareVisibility,
      shared_post_id: shareTargetId,
    });
    setSharing(false);
    if (error) {
      setShareError("Opslaget kunne ikke deles. Prøv igen.");
      return;
    }
    setShared(true);
    setComposer(false);
    setShareMenu(false);
    setShareText("");
    router.refresh();
    setTimeout(() => setShared(false), 3000);
  }

  async function shareLink() {
    setShareMenu(false);
    const url = `${window.location.origin}/p/${shareTargetId}`;
    // Mobil: åbn telefonens del-menu (Messenger, SMS, Facebook ...)
    if (navigator.share) {
      try {
        await navigator.share({ url, title: "HookedSpace" });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // brugeren lukkede menuen
      }
    }
    // Computer: kopier linket
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Kopier linket:", url);
    }
  }

  const [reacted, setReacted] = useState(initialReacted);
  const [reactionCount, setReactionCount] = useState(initialReactionCount);
  const [reactionBusy, setReactionBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleReaction() {
    if (!viewerId || reactionBusy) return;
    const next = !reacted;
    setReacted(next);
    setReactionCount((c) => c + (next ? 1 : -1));
    setReactionBusy(true);

    const supabase = createClient();
    const { error } = next
      ? await supabase.from("post_reactions").insert({ post_id: postId, user_id: viewerId })
      : await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", viewerId);

    if (error) {
      setReacted(!next);
      setReactionCount((c) => c + (next ? -1 : 1));
    }
    setReactionBusy(false);
  }

  async function openComments() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || comments !== null) return;

    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("post_comments")
      .select(COMMENT_SELECT)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(100);
    setComments((data ?? []) as unknown as Comment[]);
    setLoading(false);
  }

  async function submitComment() {
    const body = text.trim();
    if (!viewerId || !body || sending) return;
    setError(null);
    setSending(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: viewerId, body })
      .select(COMMENT_SELECT)
      .single();

    setSending(false);
    if (error || !data) {
      setError("Kommentaren kunne ikke gemmes. Prøv igen.");
      return;
    }
    setComments((cur) => [...(cur ?? []), data as unknown as Comment]);
    setCommentCount((c) => c + 1);
    setText("");
  }

  async function deleteComment(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    if (!error) {
      setComments((cur) => (cur ?? []).filter((c) => c.id !== id));
      setCommentCount((c) => Math.max(0, c - 1));
    }
  }

  return (
    <div>
      {/* Tællere */}
      {(reactionCount > 0 || commentCount > 0) && (
        <div className="flex items-center justify-between px-4 pt-3 text-sm text-deep-700">
          <span>{reactionCount > 0 && <>🎣 {reactionCount}</>}</span>
          {commentCount > 0 && (
            <button type="button" onClick={openComments} className="hover:underline">
              {commentCount} {commentCount === 1 ? "kommentar" : "kommentarer"}
            </button>
          )}
        </div>
      )}

      {/* Knapper */}
      <div className="mx-4 mt-2 flex gap-1 border-t border-mist-100 py-1">
        <button
          type="button"
          onClick={toggleReaction}
          disabled={!viewerId}
          aria-pressed={reacted}
          className={`flex flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-1 py-2 text-[13px] font-semibold sm:px-2 sm:text-sm transition hover:bg-mist-50 ${
            reacted ? "text-lure-500" : "text-deep-700"
          }`}
        >
          <span className={`text-base transition ${reacted ? "scale-110" : "grayscale"}`} aria-hidden>
            🎣
          </span>
          Knæk og bræk
        </button>
        <button
          type="button"
          onClick={openComments}
          className="flex flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-1 py-2 text-[13px] font-semibold sm:px-2 sm:text-sm text-deep-700 transition hover:bg-mist-50"
        >
          <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
          Kommenter
        </button>
        {shareable && (
          <button
            type="button"
            onClick={onShareClick}
            aria-expanded={shareMenu}
            className={`flex flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-1 py-2 text-[13px] font-semibold sm:px-2 sm:text-sm transition hover:bg-mist-50 ${
              copied || shared ? "text-reed-500" : shareMenu ? "bg-mist-50 text-deep-900" : "text-deep-700"
            }`}
          >
            {copied || shared ? <Check className="h-5 w-5 shrink-0" aria-hidden /> : <Share2 className="h-5 w-5 shrink-0" aria-hidden />}
            {copied ? "Kopieret" : shared ? "Delt" : "Del"}
          </button>
        )}
      </div>

      {/* Del-valg */}
      {shareMenu && !composer && (
        <div className="mx-4 mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setComposer(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-deep-900 px-3 py-2.5 text-sm font-semibold text-mist-50 hover:bg-deep-800"
          >
            <Repeat2 className="h-4 w-4" aria-hidden />
            Del i dit feed
          </button>
          <button
            type="button"
            onClick={shareLink}
            className="flex items-center justify-center gap-2 rounded-lg bg-mist-100 px-3 py-2.5 text-sm font-semibold text-deep-900 hover:bg-mist-50"
          >
            <Link2 className="h-4 w-4" aria-hidden />
            Del link
          </button>
        </div>
      )}

      {/* Skriv noget til delingen */}
      {composer && (
        <div className="mx-4 mb-3 space-y-2 rounded-xl bg-mist-50 p-3">
          <textarea
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
            maxLength={5000}
            rows={2}
            autoFocus
            placeholder="Skriv noget om opslaget (valgfrit)"
            className="w-full resize-y rounded-lg border border-mist-100 bg-white px-3 py-2 text-sm text-deep-950 outline-none focus:border-deep-700"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={shareVisibility}
              onChange={(e) => setShareVisibility(e.target.value as Visibility)}
              aria-label="Hvem kan se delingen"
              className="rounded-lg border border-mist-100 bg-white px-2 py-2 text-sm text-deep-900 outline-none focus:border-deep-700"
            >
              <option value="public">Offentlig</option>
              <option value="followers">Følgere</option>
              <option value="private">Kun mig</option>
            </select>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setComposer(false);
                  setShareMenu(false);
                }}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-deep-700 hover:bg-mist-100"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={shareToFeed}
                disabled={sharing}
                className="flex items-center gap-2 rounded-lg bg-deep-900 px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-deep-800 disabled:opacity-60"
              >
                {sharing && <Loader2 className="h-4 w-4 animate-spin" />}
                Del nu
              </button>
            </div>
          </div>
          {shareError && <p className="text-xs text-red-700">{shareError}</p>}
        </div>
      )}

      {/* Kommentarer */}
      {open && (
        <div className="space-y-3 border-t border-mist-100 px-4 py-3">
          {loading && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-deep-700" />
            </div>
          )}

          {comments?.map((c) => {
            const name = c.author?.display_name ?? c.author?.username ?? "Ukendt";
            const canDelete = viewerId === c.user_id || viewerId === postOwnerId;
            return (
              <div key={c.id} className="group flex gap-2">
                <Link href={c.author ? `/u/${c.author.username}` : "#"}>
                  <Avatar name={name} url={c.author?.avatar_url ?? null} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="inline-block max-w-full rounded-2xl bg-mist-100 px-3 py-2">
                    {c.author ? (
                      <Link href={`/u/${c.author.username}`} className="text-sm font-semibold text-deep-950 hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-deep-950">{name}</span>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm text-deep-900">{c.body}</p>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 px-3 text-xs text-deep-700">
                    <time dateTime={c.created_at}>{shortTime(c.created_at)}</time>
                    {viewerId && viewerId !== c.user_id && (
                      <button
                        type="button"
                        onClick={() => setReportCommentId(c.id)}
                        className="flex items-center gap-1 opacity-70 hover:text-red-700 hover:opacity-100"
                      >
                        <Flag className="h-3 w-3" aria-hidden />
                        Rapportér
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteComment(c.id)}
                        className="flex items-center gap-1 opacity-70 hover:text-red-700 hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                        Slet
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {reportCommentId && (
            <ReportDialog targetType="comment" targetId={reportCommentId} onClose={() => setReportCommentId(null)} />
          )}

          {comments && comments.length === 0 && !loading && (
            <p className="text-sm text-deep-700">Ingen kommentarer endnu. Skriv den første.</p>
          )}

          {viewerId && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitComment();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                rows={1}
                maxLength={1000}
                placeholder="Skriv en kommentar..."
                aria-label="Skriv en kommentar"
                className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl bg-mist-100 px-4 py-2 text-sm text-deep-950 outline-none focus:bg-mist-50 focus:ring-1 focus:ring-deep-700"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                aria-label="Send kommentar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-deep-900 text-mist-50 hover:bg-deep-800 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          )}
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
