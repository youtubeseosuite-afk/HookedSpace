-- supabase/019_auction_reports.sql
-- NY FIL. Kør i Supabase → SQL Editor (efter 018).
-- Gør det muligt at rapportere en auktion fra GrejAuktionen. Rapporten lander i /admin/rapporter,
-- og ejeren af det rapporterede (sælgeren) udfyldes automatisk ligesom ved opslag og kommentarer.

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports
  add constraint reports_target_type_check
  check (target_type in ('post','comment','user','group','auction'));

create or replace function public.reports_fill_target_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.target_user_id := case new.target_type
    when 'post'    then (select user_id from public.posts where id = new.target_id)
    when 'comment' then (select user_id from public.post_comments where id = new.target_id)
    when 'user'    then new.target_id
    when 'group'   then (select created_by from public.groups where id = new.target_id)
    when 'auction' then (select seller_id from public.auctions where id = new.target_id)
  end;
  new.status := 'open';
  new.resolved_by := null;
  new.resolved_at := null;
  new.resolution_note := null;
  return new;
end; $$;

revoke execute on function public.reports_fill_target_user() from public, anon, authenticated;
