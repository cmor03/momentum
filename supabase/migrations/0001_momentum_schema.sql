-- Momentum consistency tracker.
-- NOTE: this Supabase project is shared with other apps. Everything here is
-- prefixed momentum_ and strictly additive — no changes to existing objects,
-- no triggers on auth.users.

create table public.momentum_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  timezone   text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table public.momentum_buckets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  color         text not null,
  weekly_target smallint not null check (weekly_target between 1 and 21),
  sort_order    smallint not null default 0,
  archived      boolean not null default false
);

create index momentum_buckets_user_idx on public.momentum_buckets (user_id);

-- The 3-log daily cap is declarative: each log occupies slot 1..3 and
-- (user_id, logged_on, slot) is unique. No trigger needed; concurrent
-- devices collide with a clean 23505 the sync engine handles.
create table public.momentum_logs (
  id         uuid primary key, -- client-generated for idempotent offline sync
  user_id    uuid not null references auth.users (id) on delete cascade,
  bucket_id  uuid not null references public.momentum_buckets (id) on delete cascade,
  logged_on  date not null,
  slot       smallint not null check (slot between 1 and 3),
  created_at timestamptz not null default now(),
  unique (user_id, logged_on, slot)
);

create index momentum_logs_user_date_idx on public.momentum_logs (user_id, logged_on);

create table public.momentum_snapshots (
  user_id        uuid not null references auth.users (id) on delete cascade,
  date           date not null,
  momentum       numeric(7, 4) not null check (momentum >= 0 and momentum <= 100),
  completion_pct numeric(7, 4) not null check (completion_pct >= 0 and completion_pct <= 100),
  primary key (user_id, date)
);

alter table public.momentum_profiles enable row level security;
alter table public.momentum_buckets enable row level security;
alter table public.momentum_logs enable row level security;
alter table public.momentum_snapshots enable row level security;

create policy "momentum_profiles_own" on public.momentum_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "momentum_buckets_own" on public.momentum_buckets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "momentum_logs_own" on public.momentum_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "momentum_snapshots_own" on public.momentum_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
