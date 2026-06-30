-- Watch Style Club — 複数メディア / 動画 / SKU AWJフラグ
-- すべて追加のみ・既存挙動を壊さない非破壊変更。

-- ① post_media（1投稿に複数メディア。sort_order=0 がカバー）
create table if not exists public.post_media (
  id               uuid primary key default gen_random_uuid(),
  post_id          uuid not null references public.posts(id) on delete cascade,
  media_type       text not null default 'image' check (media_type in ('image','video')),
  storage_path     text not null,
  width            int,                 -- Masonry/比率計算用
  height           int,
  duration_seconds numeric,             -- 動画の長さ（取得できた場合）
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists post_media_post_idx on public.post_media (post_id, sort_order);

alter table public.post_media enable row level security;

-- 閲覧：親postが承認済み or 本人 or admin
drop policy if exists post_media_select on public.post_media;
create policy post_media_select on public.post_media for select using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and (p.status = 'approved' or p.user_id = auth.uid() or public.is_admin())
  )
);
-- 投稿：自分のpostにのみ
drop policy if exists post_media_insert on public.post_media;
create policy post_media_insert on public.post_media for insert with check (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
);
-- 削除：本人 or admin
drop policy if exists post_media_delete on public.post_media;
create policy post_media_delete on public.post_media for delete using (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  or public.is_admin()
);

-- ② SKU に AWJ取扱フラグ（将来 Nomad/Pitaka 等の未取扱ブランド登録に備える）
alter table public.skus add column if not exists is_awj boolean not null default true;

-- ③ Storage：post-images に動画許可と容量上限（50MB）
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp',
      'video/mp4','video/quicktime'
    ]
where id = 'post-images';
