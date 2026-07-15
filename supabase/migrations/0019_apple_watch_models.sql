-- Watch Style Club — Product Catalog 再設計 ①: Apple Watch 構造化カタログ
-- Supabase SQL Editor で 0018 の後に実行。既存テーブルには一切触れない（追加のみ・非破壊）。
--
-- ■ 目的
--   posts.watch_model（自由文字列）を、Family / Generation / 素材 / 色 / サイズ を持つ
--   構造化マスタへ進化させる。「Ultra 2 に人気のStyle」等の分析軸をSQLで書ける形にする。
--   watch_models（label のみの旧マスタ）は 0022 で廃止予定。それまで両方存在してよい。
--
-- ■ 注意
--   display_name は既存 posts.watch_model / profiles.watch_model の文字列と完全一致させる
--   （0021 の owned_watches backfill・ギャラリーフィルタ互換のため）。

create table if not exists public.apple_watch_models (
  id             uuid primary key default gen_random_uuid(),
  family         text not null,              -- 'Ultra' | 'Series' | 'SE' | 'Other'
  generation     int  not null,              -- Ultra 2 → 2, Series 10 → 10。Other は 0
  display_name   text not null unique,       -- 例 'Apple Watch Ultra 2'（旧watch_models.labelと一致）
  case_materials text[] not null default '{}',  -- 例 {'Titanium'}
  case_colors    text[] not null default '{}',  -- 例 {'Natural','Black'}
  case_sizes     int[]  not null default '{}',  -- mm。例 {49}
  released_year  int,
  sort_order     int not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create unique index if not exists apple_watch_models_family_gen_uidx
  on public.apple_watch_models (family, generation);

-- RLS: 公開read / admin write（brands と同型）
alter table public.apple_watch_models enable row level security;
drop policy if exists awm_select on public.apple_watch_models;
create policy awm_select on public.apple_watch_models for select using (true);
drop policy if exists awm_write on public.apple_watch_models;
create policy awm_write on public.apple_watch_models for all
  using (public.is_admin()) with check (public.is_admin());

-- seed: 現 watch_models の9機種相当を構造化して投入
insert into public.apple_watch_models
  (family, generation, display_name, case_materials, case_colors, case_sizes, released_year, sort_order, is_active)
values
  ('Ultra',  2,  'Apple Watch Ultra 2',      '{Titanium}',          '{Natural,Black}',                       '{49}',    2023, 10, true),
  ('Ultra',  1,  'Apple Watch Ultra',        '{Titanium}',          '{Natural}',                             '{49}',    2022, 11, true),
  ('Series', 10, 'Apple Watch Series 10',    '{Aluminum,Titanium}', '{"Jet Black",Silver,"Rose Gold",Natural,Gold,Slate}', '{42,46}', 2024, 20, true),
  ('Series', 9,  'Apple Watch Series 9',     '{Aluminum,"Stainless Steel"}', '{Midnight,Starlight,Silver,Pink,Red,Graphite,Gold}', '{41,45}', 2023, 21, true),
  ('Series', 8,  'Apple Watch Series 8',     '{Aluminum,"Stainless Steel"}', '{Midnight,Starlight,Silver,Red,Graphite,Gold}',       '{41,45}', 2022, 22, true),
  ('Series', 7,  'Apple Watch Series 7',     '{Aluminum,"Stainless Steel",Titanium}', '{Midnight,Starlight,Green,Blue,Red,Silver,Graphite,Gold}', '{41,45}', 2021, 23, true),
  ('SE',     2,  'Apple Watch SE (第2世代)', '{Aluminum}',          '{Midnight,Starlight,Silver}',           '{40,44}', 2022, 30, true),
  ('SE',     1,  'Apple Watch SE',           '{Aluminum}',          '{"Space Gray",Silver,Gold}',            '{40,44}', 2020, 31, true),
  ('Other',  0,  'その他 / わからない',       '{}',                  '{}',                                    '{}',      null, 99, true)
on conflict (display_name) do nothing;
