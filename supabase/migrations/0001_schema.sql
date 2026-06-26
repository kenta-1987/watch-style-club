-- Watch Style Club — schema (S1)
-- Supabase Studio の SQL Editor で 0001 → 0002 → 0003 の順に実行してください。

-- ① プロフィール（auth.users と 1:1）
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  nickname         text not null,
  watch_model      text,
  current_band     text,
  marketing_opt_in boolean not null default true,
  role             text not null default 'member',  -- 'member' | 'admin'
  created_at       timestamptz not null default now()
);

-- ② 投稿
create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  image_path     text not null,
  nickname       text not null,
  watch_model    text not null,
  band_brand     text,
  band_name      text,
  color          text,
  comment        text,
  product_url    text,
  product_handle text,
  status         text not null default 'pending',  -- pending | approved | rejected
  like_count     int  not null default 0,
  created_at     timestamptz not null default now(),
  approved_at    timestamptz,
  constraint posts_status_check check (status in ('pending','approved','rejected'))
);
create index if not exists posts_status_created_idx on public.posts (status, created_at desc);
create index if not exists posts_watch_model_idx    on public.posts (watch_model);
create index if not exists posts_band_brand_idx     on public.posts (band_brand);
create index if not exists posts_user_idx           on public.posts (user_id);

-- ③ いいね（フェーズ2、先に作成）
create table if not exists public.post_likes (
  post_id    uuid references public.posts(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ④ キャンペーン
create table if not exists public.campaigns (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  title     text not null,
  starts_at timestamptz,
  ends_at   timestamptz,
  is_active boolean not null default true
);

-- ⑤ キャンペーン応募
create table if not exists public.campaign_entries (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  post_id     uuid references public.posts(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (campaign_id, user_id)
);

-- ⑥⑦ フィルタ用マスタ
create table if not exists public.watch_models (label text primary key, sort_order int default 0);
create table if not exists public.band_brands  (label text primary key, sort_order int default 0);
