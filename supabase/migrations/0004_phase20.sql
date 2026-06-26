-- Watch Style Club — Phase 2.0
-- 人気ランキング / Editor's Pick / 保存（Bookmark）
-- Supabase Studio の SQL Editor で実行してください（0001〜0003/seed の後）。

-- ① Editor's Pick：投稿のキュレーション（official とは別概念）
alter table public.posts add column if not exists featured_at timestamptz;
create index if not exists posts_featured_idx
  on public.posts (featured_at desc) where featured_at is not null;

-- ② 保存（非公開・post_likes と同型）
create table if not exists public.post_bookmarks (
  post_id    uuid references public.posts(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_bookmarks enable row level security;

drop policy if exists bookmarks_select_own on public.post_bookmarks;
create policy bookmarks_select_own on public.post_bookmarks for select
  using (auth.uid() = user_id);
drop policy if exists bookmarks_modify_own on public.post_bookmarks;
create policy bookmarks_modify_own on public.post_bookmarks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ③ ランキング集計用インデックス
create index if not exists post_likes_created_idx on public.post_likes (created_at);

-- ④ ランキング関数：期間内（週/月）のいいね数で post_id とスコアを返す
create or replace function public.get_ranking(p_period text, p_limit int default 30)
returns table (post_id uuid, score bigint)
language sql stable
as $$
  select pl.post_id, count(*)::bigint as score
  from public.post_likes pl
  join public.posts p on p.id = pl.post_id and p.status = 'approved'
  where pl.created_at >= now() - (
    case when p_period = 'month' then interval '30 days' else interval '7 days' end
  )
  group by pl.post_id
  order by score desc, max(pl.created_at) desc
  limit p_limit;
$$;
