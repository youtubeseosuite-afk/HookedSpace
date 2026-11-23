// src/app/(app)/auktioner/[id]/deal-chat.tsx
// NY FIL. Beskeder mellem sælger og vinder på en solgt auktion, så de kan aftale betaling og afhentning.
// Kun de to kan læse og skrive (Row Level Security). Nye beskeder hentes hvert 8. sekund.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send, Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Message = { id: number; sender_id: string; body: string; created_at: string; read_at: string | null };

function timeText(iso: string) {
  return new Date(iso).toLocaleString("da-DK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  });
}

export default function DealChat({
  auctionId,
  meId,
  role,
  other,
  price,
}: {
  auctionId: string;
  meId: string;
  role: "seller" | "buyer";
  other: { name: string; username: string | null };
  price: number;
}) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    let rows: Message[] = [];
    try {
      const { data } = await supabase
        .from("auction_messages")
        .select("id, sender_id, body, created_at, read_at")
        .eq("auction_id", auctionId)
        .order("created_at", { ascending: true })
        .limit(500);
      rows = (data ?? []) as Message[];
    } catch {
      // Ingen forbindelse lige nu: prøv igen ved næste hentning
    }
    setMessages((cur) => (cur && cur.length === rows.length && cur.at(-1)?.id === rows.at(-1)?.id ? cur : rows));
    // Marker den andens beskeder som læst
    if (rows.some((m) => m.sender_id !== meId && !m.read_at)) {
      await supabase
        .from("auction_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("auction_id", auctionId)
        .neq("sender_id", meId)
        .is("read_at", null);
    }
  }, [auctionId, meId]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 8000);
    return () => clearInterval(t);
  }, [load]);

  // Rul ned til nyeste besked
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages?.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insErr } = await supabase
      .from("auction_messages")
      .insert({ auction_id: auctionId, sender_id: meId, body })
      .select("id, sender_id, body, created_at, read_at")
      .single()
      .then(
        (r) => r,
        () => ({ data: null, error: new Error("offline") })
      );
    setSending(false);
    if (insErr || !data) {
      setError("Beskeden kunne ikke sendes. Prøv igen.");
      return;
    }
    setMessages((cur) => [...(cur ?? []), data as Message]);
    setText("");
  }

  const otherLink = other.username ? (
    <Link href={`/u/${other.username}`} className="font-semibold text-deep-950 hover:underline">
      {other.name}
    </Link>
  ) : (
    <span className="font-semibold text-deep-950">{other.name}</span>
  );

  return (
    <section id="handel" className="scroll-mt-20 overflow-hidden rounded-2xl bg-white shadow-sm ring-2 ring-lure-400">
      <div className="flex items-start gap-3 bg-lure-400/20 p-4">
        <Handshake className="mt-0.5 h-6 w-6 shrink-0 text-deep-900" aria-hidden />
        <div className="text-sm text-deep-900">
          <p className="font-bold text-deep-950">
            {role === "buyer" ? "Du vandt auktionen" : "Din auktion er solgt"} for {price.toLocaleString("da-DK")} kr.
          </p>
          <p>
            Skriv sammen med {otherLink} og aftal betaling (fx MobilePay) og afhentning eller fragt. Kun I to kan se beskederne.
          </p>
        </div>
      </div>

      <div ref={listRef} className="max-h-96 space-y-2 overflow-y-auto p-4">
        {messages === null ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-deep-700" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-deep-700">
            Ingen beskeder endnu. {role === "buyer" ? "Skriv til sælgeren" : "Skriv til køberen"} for at komme i gang.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? "rounded-br-sm bg-deep-900 text-mist-50" : "rounded-bl-sm bg-mist-100 text-deep-950"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-[11px] ${mine ? "text-reed-300" : "text-deep-700"}`}>
                    {timeText(m.created_at)}
                    {mine && m.read_at ? " · Læst" : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-mist-100 p-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder={role === "buyer" ? "Skriv til sælgeren…" : "Skriv til køberen…"}
          aria-label="Skriv en besked"
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl bg-mist-100 px-4 py-2 text-sm text-deep-950 outline-none focus:bg-mist-50 focus:ring-1 focus:ring-deep-700"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Send besked"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-deep-900 text-mist-50 hover:bg-deep-800 disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-xs text-red-700">{error}</p>}
      <p className="px-4 pb-3 text-xs text-deep-700">
        Del aldrig koder eller kortoplysninger. Mød gerne op og se grejet, før du betaler.
      </p>
    </section>
  );
}
