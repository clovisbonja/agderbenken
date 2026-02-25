create extension if not exists pgcrypto;

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abbreviation text not null,
  color text,
  program_url text not null,
  website text,
  created_at timestamptz not null default now()
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  title text not null,
  value text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_list_items_list_id on public.list_items (list_id);
create index if not exists idx_list_items_sort_order on public.list_items (sort_order);

alter table public.parties enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

drop policy if exists "Public can read parties" on public.parties;
create policy "Public can read parties"
on public.parties for select
to anon, authenticated
using (true);

drop policy if exists "Public can read lists" on public.lists;
create policy "Public can read lists"
on public.lists for select
to anon, authenticated
using (true);

drop policy if exists "Public can read list_items" on public.list_items;
create policy "Public can read list_items"
on public.list_items for select
to anon, authenticated
using (true);
