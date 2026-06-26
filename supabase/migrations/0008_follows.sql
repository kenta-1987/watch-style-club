-- Watch Style Club v2.1 — Phase A ③
-- フォロー（構造だけ用意・今回UIは作らない）。将来 Follower/Following を載せる土台。

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

drop policy if exists follows_select_all on public.follows;
create policy follows_select_all on public.follows for select using (true);

drop policy if exists follows_modify_own on public.follows;
create policy follows_modify_own on public.follows for all
  using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
