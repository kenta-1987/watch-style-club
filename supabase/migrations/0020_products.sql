-- Watch Style Club — Product Catalog 再設計 ②: Product 第一級昇格
-- Supabase SQL Editor で 0019 の後に実行。
--
-- ■ 目的
--   Brand → Category(将来用) → Product → SKU → Post の階層を確立する。
--   series を products へ昇格（products.id = series.id を維持するため FK 移行が単純コピーで済む）。
--   商品レベルの属性（name/説明/画像/URL/販売状態/Shopify handle）を Product が持ち、
--   SKU はバリアント（カラー）に専念する。
--
-- ■ 事実列とWSC編集列の分離（最重要・Shopify同期の前提）
--   事実列（Shopify同期が上書きしてよい）: name, description, image_path, product_url,
--     shopify_product_id, shopify_product_handle, sales_status, synced_at
--   WSC編集列（同期は絶対に触らない）: category_id, is_published, is_recommended,
--     is_featured, sort_order, wsc_description
--
-- ■ 後方互換
--   series / skus.series_id / skus.shopify_product_handle は残す（旧コードが参照中でも壊れない）。
--   削除は 0022（コード切替の本番反映・動作確認後にのみ実行）。

-- ⓪ バックアップ（万一の切り戻し用。確認後に手動 drop してよい）
create table if not exists public._bak_series_20260715 as select * from public.series;
create table if not exists public._bak_skus_20260715   as select * from public.skus;

-- ① カテゴリ（将来用: Band / Case / Charger / Accessory ...）
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.categories (slug, name, sort_order) values
  ('band',      'バンド',       10),
  ('case',      'ケース',       20),
  ('charger',   '充電器',       30),
  ('accessory', 'アクセサリー', 40)
on conflict (slug) do nothing;

-- ② Product（第一級概念）
create table if not exists public.products (
  id                     uuid primary key default gen_random_uuid(),
  brand_id               uuid not null references public.brands(id) on delete cascade,
  category_id            uuid references public.categories(id) on delete set null,
  slug                   text not null,
  -- ---- 事実列（Shopify同期が上書きする領域）----
  name                   text not null,
  description            text,
  image_path             text,                 -- Hero相当の代表画像（http URL または storage path）
  product_url            text,                 -- 販売ページURL（Shopify onlineStoreUrl 等）
  shopify_product_id     text unique,          -- Shopify Product GID（同期キー）
  shopify_product_handle text unique,          -- /sku/[handle] 互換・購入リンク生成
  sales_status           text not null default 'active',  -- 'active' | 'sold_out' | 'discontinued'
  synced_at              timestamptz,
  source                 text not null default 'manual',  -- 'manual' | 'shopify'
  -- ---- WSC編集列（同期は絶対に触らない領域）----
  is_published           boolean not null default false,  -- WSC掲載ON/OFF
  is_recommended         boolean not null default false,  -- おすすめ
  is_featured            boolean not null default false,  -- 特集
  sort_order             int not null default 0,
  wsc_description        text,                             -- Style Commerce向け説明（編集部執筆）
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint products_sales_status_check
    check (sales_status in ('active','sold_out','discontinued'))
);

create unique index if not exists products_brand_slug_uidx on public.products (brand_id, slug);
create index if not exists products_brand_idx    on public.products (brand_id);
create index if not exists products_category_idx on public.products (category_id);

-- ③ Product Media（投稿画像とは別の商品用メディア。将来の商品ページで利用）
create table if not exists public.product_media (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  media_role  text not null default 'gallery',  -- 'hero' | 'gallery' | 'description'
  url         text not null,                     -- http URL（Shopify CDN）または storage path
  alt         text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  constraint product_media_role_check check (media_role in ('hero','gallery','description'))
);
create index if not exists product_media_product_idx on public.product_media (product_id, media_role, sort_order);

-- ④ RLS
alter table public.categories    enable row level security;
alter table public.products      enable row level security;
alter table public.product_media enable row level security;

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select using (true);
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- 非公開商品（is_published=false）は一般ユーザーに見せない。
-- ただし既存投稿が非公開商品のSKUを参照している場合の表示互換のため select は公開範囲を広めに取る…
-- のではなく、**掲載OFF商品も「商品情報の表示」は許可し、ピッカー掲載のみアプリ側で絞る**。
-- 理由: 掲載OFF = 「新規投稿の対象から外す」であり、過去投稿のバンド名表示まで消すと
--       既存投稿が壊れるため（後方互換の不変条件）。
drop policy if exists products_select on public.products;
create policy products_select on public.products for select using (true);
drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_media_select on public.product_media;
create policy product_media_select on public.product_media for select using (true);
drop policy if exists product_media_write on public.product_media;
create policy product_media_write on public.product_media for all
  using (public.is_admin()) with check (public.is_admin());

-- ⑤ series → products 昇格 backfill
--    products.id = series.id を維持（skus.product_id への移行が単純コピーになる）。
--    shopify_product_handle は配下SKUの最初の非null値を昇格。
--    全て source='manual' / is_published=true（現行の公開状態を維持）/ category='band'。
insert into public.products
  (id, brand_id, category_id, slug, name, shopify_product_handle, source, is_published, sales_status)
select
  s.id,
  s.brand_id,
  (select c.id from public.categories c where c.slug = 'band'),
  coalesce(
    nullif(s.slug, ''),
    lower(regexp_replace(s.name, '[^a-zA-Z0-9]+', '-', 'g'))
  ) || case
    -- brand内slug重複時はseries.idの先頭8文字を付けて回避（データ僅少のため実質発動しない）
    when exists (
      select 1 from public.series s2
      where s2.brand_id = s.brand_id and s2.id <> s.id
        and coalesce(nullif(s2.slug,''), lower(regexp_replace(s2.name,'[^a-zA-Z0-9]+','-','g')))
          = coalesce(nullif(s.slug,''), lower(regexp_replace(s.name,'[^a-zA-Z0-9]+','-','g')))
    ) then '-' || left(s.id::text, 8)
    else ''
  end,
  s.name,
  (select k.shopify_product_handle from public.skus k
    where k.series_id = s.id and k.shopify_product_handle is not null
    order by k.created_at asc limit 1),
  'manual',
  true,
  'active'
from public.series s
on conflict (id) do nothing;

-- ⑥ skus を Product 配下へ接続（series_id は残す＝旧コード互換）
alter table public.skus add column if not exists product_id uuid references public.products(id) on delete cascade;
alter table public.skus add column if not exists position   int not null default 0;

update public.skus set product_id = series_id where product_id is null;

alter table public.skus alter column product_id set not null;
create index if not exists skus_product_idx on public.skus (product_id);
