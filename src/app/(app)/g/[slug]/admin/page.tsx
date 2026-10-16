// src/app/(app)/g/[slug]/admin/page.tsx
// NY FIL. Admin-panel for en gruppe: ventende anmodninger (godkend/afvis) og medlemmer (gør til admin / fjern).
// Kun for admins. Andre sendes tilbage til gruppesiden.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import RequestsList, { type JoinRequest } from "./requests-list";
import MembersList, { type Member } from "./members-list";

export const metadata: Metadata = {
  title: "Administrer gruppe",
};

type Params = { slug: string };

const MEMBER_SELECT =
  "user_id, role, status, request_message, requested_at, joined_at, profile:profiles!group_members_user_id_fkey ( username, display_name, avatar_url, city )";

export default async function GroupAdminPage({ params }: { params: Promise<Params> }) {
  const me = await requireProfile();
  const { slug } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase.from("groups").select("id, slug, name").eq("slug", slug).maybeSingle();
  if (!group) notFound();

  const { data: mine } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", group.id)
    .eq("user_id", me.id)
    .maybeSingle();
  if (mine?.status !== "active" || mine.role !== "admin") redirect(`/g/${group.slug}`);

  const [{ data: pendingData }, { data: memberData }] = await Promise.all([
    supabase
      .from("group_members")
      .select(MEMBER_SELECT)
      .eq("group_id", group.id)
      .eq("status", "pending")
      .order("requested_at", { ascending: true }),
    supabase
      .from("group_members")
      .select(MEMBER_SELECT)
      .eq("group_id", group.id)
      .eq("status", "active")
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true }),
  ]);

  const requests = (pendingData ?? []) as unknown as JoinRequest[];
  const members = (memberData ?? []) as unknown as Member[];

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:py-8">
      <div>
        <Link href={`/g/${group.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-deep-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Tilbage til {group.name}
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-deep-900">
          <Shield className="h-6 w-6 text-lure-500" aria-hidden />
          Administrer gruppe
        </h1>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-deep-700">
          Anmodninger ({requests.length})
        </h2>
        <RequestsList groupId={group.id} requests={requests} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-deep-700">
          Medlemmer ({members.length})
        </h2>
        <MembersList groupId={group.id} myId={me.id} members={members} />
      </section>
    </main>
  );
}
