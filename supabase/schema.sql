-- ─────────────────────────────────────────────────────────────────────────────
-- Quiniela · World Cup 2026 — Database Schema
-- Safe to re-run: uses IF NOT EXISTS + drops stale policies first.
-- ───────────────────────────────────────────��─────────────────────────────────

-- ── profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id     uuid references auth.users(id) on delete cascade primary key,
  name   text not null,
  avatar text not null
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: anyone can read"      on public.profiles;
drop policy if exists "profiles: users insert their own" on public.profiles;
drop policy if exists "profiles: users update their own" on public.profiles;

create policy "profiles: anyone can read"
  on public.profiles for select using (true);

create policy "profiles: users insert their own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles: users update their own"
  on public.profiles for update using (auth.uid() = id);

-- ── leagues ──────────────────────────────────────────────────────────────────
create table if not exists public.leagues (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  code       char(6) not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.leagues enable row level security;

drop policy if exists "leagues: anyone authenticated can read"  on public.leagues;
drop policy if exists "leagues: authenticated users can create" on public.leagues;

create policy "leagues: anyone authenticated can read"
  on public.leagues for select using (auth.role() = 'authenticated');

create policy "leagues: authenticated users can create"
  on public.leagues for insert with check (auth.role() = 'authenticated');

-- ── league_members ───────────────────────────────────────────────────────────
create table if not exists public.league_members (
  league_id uuid references public.leagues(id) on delete cascade,
  user_id   uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

alter table public.league_members enable row level security;

drop policy if exists "league_members: anyone authenticated can read" on public.league_members;
drop policy if exists "league_members: users can join leagues"        on public.league_members;

create policy "league_members: anyone authenticated can read"
  on public.league_members for select using (auth.role() = 'authenticated');

create policy "league_members: users can join leagues"
  on public.league_members for insert with check (auth.uid() = user_id);

-- ── predictions ──────────────────────────────────────────────────────────────
create table if not exists public.predictions (
  user_id    uuid references auth.users(id) on delete cascade,
  match_id   text not null,
  outcome    text not null check (outcome in ('home', 'draw', 'away')),
  updated_at timestamptz default now(),
  primary key (user_id, match_id)
);

alter table public.predictions enable row level security;

drop policy if exists "predictions: anyone authenticated can read" on public.predictions;
drop policy if exists "predictions: users manage their own"        on public.predictions;

create policy "predictions: anyone authenticated can read"
  on public.predictions for select using (auth.role() = 'authenticated');

create policy "predictions: users manage their own"
  on public.predictions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── score_picks ─────────────────��──────────────────────────────���──────────────
create table if not exists public.score_picks (
  user_id    uuid references auth.users(id) on delete cascade,
  match_id   text not null,
  home_score int not null,
  away_score int not null,
  updated_at timestamptz default now(),
  primary key (user_id, match_id)
);

alter table public.score_picks enable row level security;

drop policy if exists "score_picks: anyone authenticated can read" on public.score_picks;
drop policy if exists "score_picks: users manage their own"        on public.score_picks;

create policy "score_picks: anyone authenticated can read"
  on public.score_picks for select using (auth.role() = 'authenticated');

create policy "score_picks: users manage their own"
  on public.score_picks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── match_scores ─────────────────────────────────────────────────────────────
-- Written by admin only (enforced in server action); read by all authenticated.
create table if not exists public.match_scores (
  match_id   text primary key,
  home_score smallint not null check (home_score >= 0),
  away_score smallint not null check (away_score >= 0),
  updated_at timestamptz default now()
);

alter table public.match_scores enable row level security;

drop policy if exists "match_scores: authenticated can read"  on public.match_scores;
drop policy if exists "match_scores: authenticated can write" on public.match_scores;

create policy "match_scores: authenticated can read"
  on public.match_scores for select using (auth.role() = 'authenticated');

-- Write access is open to authenticated; the server action enforces admin-only.
create policy "match_scores: authenticated can write"
  on public.match_scores for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists predictions_user_id    on public.predictions(user_id);
create index if not exists predictions_match_id   on public.predictions(match_id);
create index if not exists score_picks_user_id    on public.score_picks(user_id);
create index if not exists league_members_user_id on public.league_members(user_id);
