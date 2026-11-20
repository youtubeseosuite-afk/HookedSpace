-- supabase/018_auctions.sql
-- NY FIL. Kør i Supabase → SQL Editor (efter 017). Slå først pg_cron til (se vejledningen).
-- GREJAUKTIONEN: medlemmer sælger brugt fiskegrej på auktion. Alle kan se auktionerne, også gæster.
-- FiskoMan håndterer ingen penge: køber og sælger aftaler betaling og afhentning i en besked.
--
-- Tabeller: auctions, auction_images, auction_bids, auction_messages, auction_ratings
-- Funktioner: place_bid (byd / køb nu), auction_bids_public (budhistorik med skjulte navne),
--             close_ended_auctions (kører hvert minut via pg_cron), cancel_auction
-- Notifikationer: overbudt, vundet, solgt, ingen bud, ny besked, ny bedømmelse
-- Flex: +3 for en 👍-bedømmelse efter en handel

-- =========================================================
-- AUKTIONER
-- =========================================================
create table public.auctions (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references public.profiles(id) on delete cascade,
  title           text not null check (char_length(trim(title)) between 3 and 80),
  description     text check (char_length(description) <= 3000),
  category        text not null check (category in (
                    'stang','hjul','line','agn','fluer','waders','baad','elektronik','tasker','andet')),
  condition       text not null check (condition in ('ny','som_ny','god','brugt','reservedele')),
  start_price     int  not null check (start_price between 0 and 1000000),     -- hele kroner
  min_increment   int  not null default 10 check (min_increment between 1 and 10000),
  buy_now_price   int  check (buy_now_price is null or buy_now_price between 1 and 1000000),
  duration_days   smallint not null check (duration_days in (3, 5, 7, 10)),
  city            text check (char_length(city) <= 50),
  region          text,
  can_ship        boolean not null default false,

  -- Udfyldes af databasen
  current_price   int,                                    -- højeste bud (null = ingen bud)
  bid_count       int  not null default 0,
  high_bidder_id  uuid references public.profiles(id) on delete set null,
  ends_at         timestamptz not null default now(),
  status          text not null default 'active' check (status in ('active','sold','unsold')),
  winner_id       uuid references public.profiles(id) on delete set null,
  final_price     int,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),

  constraint auctions_buy_now_above_start check (buy_now_price is null or buy_now_price > start_price)
);

create index auctions_active_idx   on public.auctions (ends_at) where status = 'active';
create index auctions_seller_idx   on public.auctions (seller_id, created_at desc);
create index auctions_category_idx on public.auctions (category, ends_at);
create index auctions_winner_idx   on public.auctions (winner_id) where winner_id is not null;

-- Ved oprettelse: sælgeren kan ikke selv sætte pris, bud, slut-tid eller status
create or replace function public.auctions_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  p_city text;
  p_region text;
begin
  select city, region into p_city, p_region from public.profiles where id = new.seller_id;
  new.city := coalesce(nullif(trim(new.city), ''), p_city);
  new.region := coalesce(new.region, p_region, public.guess_region(new.city));
  new.current_price := null;
  new.bid_count := 0;
  new.high_bidder_id := null;
  new.status := 'active';
  new.winner_id := null;
  new.final_price := null;
  new.closed_at := null;
  new.created_at := now();
  new.ends_at := now() + make_interval(days => new.duration_days);
  return new;
end; $$;

create trigger auctions_before_insert
  before insert on public.auctions
  for each row execute function public.auctions_before_insert();

alter table public.auctions enable row level security;

-- Alle (også gæster) kan se auktioner, men ikke fra bortviste eller blokerede sælgere
create policy "auctions: læs"
  on public.auctions for select
  using (
    seller_id = auth.uid()
    or (not public.is_banned(seller_id) and not public.is_blocked_with(seller_id))
  );

create policy "auctions: opret egne"
  on public.auctions for insert to authenticated
  with check (seller_id = auth.uid() and not public.is_banned(auth.uid()));

-- Ingen update/delete for brugere. Bud går gennem place_bid, sletning gennem cancel_auction.

-- =========================================================
-- BILLEDER (højst 5)
-- =========================================================
create table public.auction_images (
  id            uuid primary key default gen_random_uuid(),
  auction_id    uuid not null references public.auctions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  storage_path  text not null,
  width         int,
  height        int,
  position      smallint not null default 0 check (position between 0 and 4),
  created_at    timestamptz not null default now(),
  unique (auction_id, position)
);
create index auction_images_auction_idx on public.auction_images (auction_id, position);

alter table public.auction_images enable row level security;

create policy "auction_images: læs"
  on public.auction_images for select using (true);
create policy "auction_images: tilføj til egen auktion"
  on public.auction_images for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.auctions a where a.id = auction_id and a.seller_id = auth.uid())
  );

-- Lager til billederne (offentlige adresser, mappe = brugerens id)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('auction-images', 'auction-images', true, 5242880, array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

create policy "auction-images: upload egne"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'auction-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "auction-images: slet egne"
  on storage.objects for delete to authenticated
  using (bucket_id = 'auction-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "auction-images: se egne"
  on storage.objects for select to authenticated
  using (bucket_id = 'auction-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- BUD (kun via place_bid; ingen kan læse tabellen direkte)
-- =========================================================
create table public.auction_bids (
  id          bigint generated always as identity primary key,
  auction_id  uuid not null references public.auctions(id) on delete cascade,
  bidder_id   uuid references public.profiles(id) on delete set null,
  amount      int  not null check (amount > 0),
  created_at  timestamptz not null default now()
);
create index auction_bids_auction_idx on public.auction_bids (auction_id, amount desc);
create index auction_bids_bidder_idx on public.auction_bids (bidder_id, created_at desc);

alter table public.auction_bids enable row level security;
-- Ingen regler = ingen direkte adgang

-- =========================================================
-- NOTIFIKATIONER: nye typer
-- =========================================================
alter table public.notifications add column if not exists auction_id uuid references public.auctions(id) on delete cascade;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'reaction','comment','tag','follow','share','badge','challenge','group_request','group_approved','flex_level',
    'auction_outbid','auction_won','auction_sold','auction_unsold','auction_message','auction_rating'
  ));

-- =========================================================
-- BYD / KØB NU
-- Returnerer { ok, message, current_price, ends_at, status }
-- =========================================================
create or replace function public.place_bid(p_auction uuid, p_amount int, p_buy_now boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  a public.auctions%rowtype;
  min_bid int;
  amount int := p_amount;
  prev_bidder uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'message', 'Du skal være logget ind for at byde.');
  end if;
  if public.is_banned(uid) then
    return jsonb_build_object('ok', false, 'message', 'Du kan ikke byde, mens din profil er bortvist.');
  end if;
  if not exists (select 1 from public.profiles where id = uid and username is not null) then
    return jsonb_build_object('ok', false, 'message', 'Gør din profil færdig, før du byder.');
  end if;

  -- Lås auktionen, så to bud ikke kan komme ind samtidig
  select * into a from public.auctions where id = p_auction for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Auktionen findes ikke.');
  end if;
  if a.status <> 'active' or a.ends_at <= now() then
    return jsonb_build_object('ok', false, 'message', 'Auktionen er slut.');
  end if;
  if a.seller_id = uid then
    return jsonb_build_object('ok', false, 'message', 'Du kan ikke byde på din egen auktion.');
  end if;
  if public.is_blocked_with(a.seller_id) then
    return jsonb_build_object('ok', false, 'message', 'Du kan ikke byde på denne auktion.');
  end if;

  -- Køb nu
  if p_buy_now then
    if a.buy_now_price is null or coalesce(a.current_price, 0) >= a.buy_now_price then
      return jsonb_build_object('ok', false, 'message', 'Køb nu er ikke muligt længere.');
    end if;
    amount := a.buy_now_price;
  else
    if a.high_bidder_id = uid then
      return jsonb_build_object('ok', false, 'message', 'Du har allerede det højeste bud.');
    end if;
    min_bid := case when a.current_price is null then a.start_price else a.current_price + a.min_increment end;
    if min_bid < 1 then min_bid := 1; end if;
    if amount is null or amount < min_bid then
      return jsonb_build_object('ok', false, 'message', format('Buddet skal være mindst %s kr.', min_bid));
    end if;
    if amount > 1000000 then
      return jsonb_build_object('ok', false, 'message', 'Buddet er for højt.');
    end if;
    -- Et bud på eller over Køb nu-prisen er et Køb nu
    if a.buy_now_price is not null and amount >= a.buy_now_price then
      p_buy_now := true;
      amount := a.buy_now_price;
    end if;
  end if;

  prev_bidder := a.high_bidder_id;

  insert into public.auction_bids (auction_id, bidder_id, amount) values (a.id, uid, amount);

  if p_buy_now then
    update public.auctions set
      current_price = amount, bid_count = bid_count + 1, high_bidder_id = uid,
      status = 'sold', winner_id = uid, final_price = amount, closed_at = now(), ends_at = now()
    where id = a.id;

    insert into public.notifications (user_id, actor_id, type, auction_id) values (uid, a.seller_id, 'auction_won', a.id);
    insert into public.notifications (user_id, actor_id, type, auction_id) values (a.seller_id, uid, 'auction_sold', a.id);
  else
    update public.auctions set
      current_price = amount, bid_count = bid_count + 1, high_bidder_id = uid,
      -- Bud i de sidste 2 minutter forlænger auktionen, så alle kan nå at svare
      ends_at = greatest(ends_at, now() + interval '2 minutes')
    where id = a.id;
  end if;

  -- Den, der blev overbudt, får besked
  if prev_bidder is not null and prev_bidder <> uid then
    insert into public.notifications (user_id, actor_id, type, auction_id) values (prev_bidder, uid, 'auction_outbid', a.id);
  end if;

  select * into a from public.auctions where id = p_auction;
  return jsonb_build_object(
    'ok', true,
    'message', case when p_buy_now then 'Du har købt varen. Skriv til sælgeren for at aftale betaling og afhentning.' else 'Dit bud er afgivet.' end,
    'current_price', a.current_price, 'ends_at', a.ends_at, 'status', a.status
  );
end; $$;

revoke execute on function public.place_bid(uuid, int, boolean) from public, anon;
grant execute on function public.place_bid(uuid, int, boolean) to authenticated;

-- Budhistorik med skjulte navne (fx "M***k"). Ens eget bud markeres.
create or replace function public.auction_bids_public(p_auction uuid)
returns table (amount int, created_at timestamptz, bidder text, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select b.amount, b.created_at,
         case
           when p.display_name is null and p.username is null then 'Slettet bruger'
           else left(coalesce(p.display_name, p.username), 1) || '***' || right(coalesce(p.display_name, p.username), 1)
         end,
         (b.bidder_id is not null and b.bidder_id = auth.uid())
  from public.auction_bids b
  left join public.profiles p on p.id = b.bidder_id
  where b.auction_id = p_auction
    and exists (select 1 from public.auctions a where a.id = p_auction)
  order by b.amount desc, b.created_at desc
  limit 100;
$$;
grant execute on function public.auction_bids_public(uuid) to anon, authenticated;

-- Træk en auktion tilbage (kun sælger, kun hvis ingen har budt). Billeder slettes af appen.
create or replace function public.cancel_auction(p_auction uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from public.auctions
  where id = p_auction and seller_id = auth.uid() and status = 'active' and bid_count = 0;
  return found;
end; $$;
revoke execute on function public.cancel_auction(uuid) from public, anon;
grant execute on function public.cancel_auction(uuid) to authenticated;

-- =========================================================
-- LUK UDLØBNE AUKTIONER (kører hvert minut)
-- =========================================================
create or replace function public.close_ended_auctions()
returns int language plpgsql security definer set search_path = '' as $$
declare
  a record;
  n int := 0;
begin
  for a in
    select id, seller_id, high_bidder_id, current_price
    from public.auctions
    where status = 'active' and ends_at <= now()
    for update skip locked
  loop
    if a.high_bidder_id is not null then
      update public.auctions
        set status = 'sold', winner_id = a.high_bidder_id, final_price = a.current_price, closed_at = now()
        where id = a.id;
      insert into public.notifications (user_id, actor_id, type, auction_id) values (a.high_bidder_id, a.seller_id, 'auction_won', a.id);
      insert into public.notifications (user_id, actor_id, type, auction_id) values (a.seller_id, a.high_bidder_id, 'auction_sold', a.id);
    else
      update public.auctions set status = 'unsold', closed_at = now() where id = a.id;
      insert into public.notifications (user_id, actor_id, type, auction_id) values (a.seller_id, a.seller_id, 'auction_unsold', a.id);
    end if;
    n := n + 1;
  end loop;
  return n;
end; $$;
revoke execute on function public.close_ended_auctions() from public, anon, authenticated;

-- Kør hvert minut (kræver at pg_cron er slået til under Database → Extensions)
select cron.schedule('luk-auktioner', '* * * * *', $$select public.close_ended_auctions()$$);

-- =========================================================
-- BESKEDER mellem sælger og vinder (kun på solgte auktioner)
-- =========================================================
create table public.auction_messages (
  id          bigint generated always as identity primary key,
  auction_id  uuid not null references public.auctions(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(trim(body)) between 1 and 2000),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index auction_messages_auction_idx on public.auction_messages (auction_id, created_at);

create or replace function public.is_auction_party(p_auction uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.auctions a
    where a.id = p_auction and a.status = 'sold' and auth.uid() in (a.seller_id, a.winner_id)
  );
$$;

alter table public.auction_messages enable row level security;

create policy "auction_messages: læs som køber eller sælger"
  on public.auction_messages for select to authenticated
  using (public.is_auction_party(auction_id));
create policy "auction_messages: skriv som køber eller sælger"
  on public.auction_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_auction_party(auction_id) and not public.is_banned(auth.uid()));
-- Modtageren kan markere beskeder som læst
create policy "auction_messages: markér læst"
  on public.auction_messages for update to authenticated
  using (public.is_auction_party(auction_id) and sender_id <> auth.uid())
  with check (public.is_auction_party(auction_id) and sender_id <> auth.uid());

-- Ny besked → den anden part får en notifikation (højst én ulæst pr. auktion)
create or replace function public.auction_message_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  other uuid;
begin
  select case when a.seller_id = new.sender_id then a.winner_id else a.seller_id end
    into other from public.auctions a where a.id = new.auction_id;
  if other is not null and not exists (
    select 1 from public.notifications
    where user_id = other and type = 'auction_message' and auction_id = new.auction_id and read_at is null
  ) then
    insert into public.notifications (user_id, actor_id, type, auction_id)
    values (other, new.sender_id, 'auction_message', new.auction_id);
  end if;
  return new;
end; $$;

create trigger auction_messages_notify
  after insert on public.auction_messages
  for each row execute function public.auction_message_notify();

-- =========================================================
-- BEDØMMELSER efter handlen (👍 / 👎) + Flex
-- =========================================================
create table public.auction_ratings (
  auction_id  uuid not null references public.auctions(id) on delete cascade,
  rater_id    uuid not null references public.profiles(id) on delete cascade,
  ratee_id    uuid not null references public.profiles(id) on delete cascade,
  positive    boolean not null,
  comment     text check (char_length(comment) <= 300),
  created_at  timestamptz not null default now(),
  primary key (auction_id, rater_id)
);
create index auction_ratings_ratee_idx on public.auction_ratings (ratee_id, created_at desc);

-- Modtageren er altid den anden part i handlen
create or replace function public.auction_ratings_fill()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  a record;
begin
  select seller_id, winner_id into a from public.auctions where id = new.auction_id;
  new.ratee_id := case when a.seller_id = new.rater_id then a.winner_id else a.seller_id end;
  new.created_at := now();
  return new;
end; $$;

create trigger auction_ratings_fill
  before insert on public.auction_ratings
  for each row execute function public.auction_ratings_fill();

alter table public.auction_ratings enable row level security;

create policy "auction_ratings: alle kan læse"
  on public.auction_ratings for select using (true);
create policy "auction_ratings: bedøm efter handel"
  on public.auction_ratings for insert to authenticated
  with check (rater_id = auth.uid() and public.is_auction_party(auction_id));

-- Flex: ny type 'rating'
alter table public.flex_events drop constraint if exists flex_events_kind_check;
alter table public.flex_events
  add constraint flex_events_kind_check
  check (kind in ('reaction','comment','share','follow','badge','challenge','rating'));

create or replace function public.auction_rating_after()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.positive then
    perform public.give_flex(new.ratee_id, new.rater_id, 'rating', new.auction_id::text, 3, null);
  end if;
  insert into public.notifications (user_id, actor_id, type, auction_id)
  values (new.ratee_id, new.rater_id, 'auction_rating', new.auction_id);
  return new;
end; $$;

create trigger auction_ratings_after
  after insert on public.auction_ratings
  for each row execute function public.auction_rating_after();

-- Interne funktioner kan ikke kaldes direkte
revoke execute on function public.auctions_before_insert() from public, anon, authenticated;
revoke execute on function public.auction_message_notify() from public, anon, authenticated;
revoke execute on function public.auction_ratings_fill() from public, anon, authenticated;
revoke execute on function public.auction_rating_after() from public, anon, authenticated;
