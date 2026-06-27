-- Watch Style Club — SKU中心設計 ① Brand / Series / SKU
-- Shopify を源泉に、SKU は handle / variant_id で参照する（価格・在庫はライブ取得）。
-- すべて新規テーブル＝既存挙動を壊さない非破壊。

create table if not exists public.brands (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  logo_path  text,
  created_at timestamptz not null default now()
);

create table if not exists public.series (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid not null references public.brands(id) on delete cascade,
  slug       text,
  name       text not null,
  created_at timestamptz not null default now()
);
create index if not exists series_brand_idx on public.series (brand_id);

create table if not exists public.skus (
  id                     uuid primary key default gen_random_uuid(),
  series_id              uuid not null references public.series(id) on delete cascade,
  color_name             text not null,            -- 例: Black / Starlight / Orange
  color_hex              text,                     -- スウォッチ用（任意）
  shopify_product_handle text,                     -- Shopify結合キー
  shopify_variant_id     text,                     -- 厳密なSKU
  image_path             text,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now()
);
create index if not exists skus_series_idx on public.skus (series_id);
create unique index if not exists skus_shopify_variant_uidx
  on public.skus (shopify_variant_id) where shopify_variant_id is not null;

-- RLS：公開read / admin write（is_admin() は 0002 で作成済み）
alter table public.brands enable row level security;
alter table public.series enable row level security;
alter table public.skus   enable row level security;

drop policy if exists brands_select on public.brands;
create policy brands_select on public.brands for select using (true);
drop policy if exists brands_write on public.brands;
create policy brands_write on public.brands for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists series_select on public.series;
create policy series_select on public.series for select using (true);
drop policy if exists series_write on public.series;
create policy series_write on public.series for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists skus_select on public.skus;
create policy skus_select on public.skus for select using (true);
drop policy if exists skus_write on public.skus;
create policy skus_write on public.skus for all
  using (public.is_admin()) with check (public.is_admin());
