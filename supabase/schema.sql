-- Two Peas: database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.

-- ---------- Tables ----------
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  user_id uuid primary key references auth.users on delete cascade,
  couple_id uuid not null references public.couples on delete cascade,
  joined_at timestamptz not null default now()
);

-- Everything you create (answers, notes, games, memories...) is an item.
create table if not exists public.items (
  couple_id uuid not null references public.couples on delete cascade,
  id text not null,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  hidden_from uuid,              -- e.g. gift ideas the other person can't see
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (couple_id, id)
);
create index if not exists items_kind_idx on public.items (couple_id, kind);
create index if not exists items_board_idx on public.items (couple_id, (data->>'board')) where kind = 'stroke';
create index if not exists items_updated_idx on public.items (couple_id, updated_at desc);

create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users on delete cascade,
  couple_id uuid not null references public.couples on delete cascade,
  sub jsonb not null,
  created_at timestamptz not null default now()
);

-- Remembers which scheduled notifications already went out.
create table if not exists public.sent_log (
  key text primary key,
  at timestamptz not null default now()
);

-- ---------- Helpers ----------
create or replace function public.my_couple() returns uuid
language sql stable security definer set search_path = public as $$
  select couple_id from public.members where user_id = auth.uid()
$$;

create or replace function public.items_before_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.hidden_from := old.hidden_from;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists items_before_write on public.items;
create trigger items_before_write before insert or update on public.items
  for each row execute function public.items_before_write();

-- Pairing: one of you creates the space, the other joins with the code.
create or replace function public.create_couple() returns text
language plpgsql security definer set search_path = public as $$
declare
  c uuid;
  k text;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then raise exception 'You are already paired'; end if;
  loop
    k := '';
    for i in 1..6 loop
      k := k || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from couples where code = k);
  end loop;
  insert into couples (code, created_by) values (k, auth.uid()) returning id into c;
  insert into members (user_id, couple_id) values (auth.uid(), c);
  return k;
end $$;

create or replace function public.join_couple(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare
  c uuid;
  n int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then raise exception 'You are already paired'; end if;
  select id into c from couples where code = upper(trim(p_code));
  if c is null then raise exception 'Code not found'; end if;
  select count(*) into n from members where couple_id = c;
  if n >= 2 then raise exception 'That space already has two people'; end if;
  insert into members (user_id, couple_id) values (auth.uid(), c);
end $$;

revoke all on function public.create_couple() from public, anon;
revoke all on function public.join_couple(text) from public, anon;
grant execute on function public.create_couple() to authenticated;
grant execute on function public.join_couple(text) to authenticated;

-- ---------- Privacy rules: only the two of you can see your stuff ----------
alter table public.couples enable row level security;
alter table public.members enable row level security;
alter table public.items enable row level security;
alter table public.push_subs enable row level security;
alter table public.sent_log enable row level security;

drop policy if exists couples_read on public.couples;
create policy couples_read on public.couples for select to authenticated using (id = public.my_couple());

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (couple_id = public.my_couple());

drop policy if exists items_read on public.items;
create policy items_read on public.items for select to authenticated
  using (couple_id = public.my_couple() and (hidden_from is null or hidden_from <> auth.uid()));
drop policy if exists items_insert on public.items;
create policy items_insert on public.items for insert to authenticated
  with check (couple_id = public.my_couple());
drop policy if exists items_update on public.items;
create policy items_update on public.items for update to authenticated
  using (couple_id = public.my_couple() and (hidden_from is null or hidden_from <> auth.uid()))
  with check (couple_id = public.my_couple());
drop policy if exists items_delete on public.items;
create policy items_delete on public.items for delete to authenticated
  using (couple_id = public.my_couple() and (hidden_from is null or hidden_from <> auth.uid()));

drop policy if exists push_own on public.push_subs;
create policy push_own on public.push_subs for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and couple_id = public.my_couple());

-- ---------- Live sync ----------
alter table public.items replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.members;
exception when duplicate_object then null; end $$;

-- ---------- Photos ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "twopeas photos read" on storage.objects;
create policy "twopeas photos read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple()::text);
drop policy if exists "twopeas photos add" on storage.objects;
create policy "twopeas photos add" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple()::text);
drop policy if exists "twopeas photos delete" on storage.objects;
create policy "twopeas photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = public.my_couple()::text);
