-- Watch Style Club — seed

-- Apple Watch モデル（フィルタ用）
insert into public.watch_models (label, sort_order) values
  ('Apple Watch Ultra 2', 10),
  ('Apple Watch Ultra', 11),
  ('Apple Watch Series 10', 20),
  ('Apple Watch Series 9', 21),
  ('Apple Watch Series 8', 22),
  ('Apple Watch Series 7', 23),
  ('Apple Watch SE (第2世代)', 30),
  ('Apple Watch SE', 31),
  ('その他 / わからない', 99)
on conflict (label) do nothing;

-- バンドブランド（フィルタ用・自由入力のサジェスト元）
insert into public.band_brands (label, sort_order) values
  ('Campagne Sélection', 10),
  ('B&', 20),
  ('n max n', 30),
  ('Apple純正', 40),
  ('その他', 99)
on conflict (label) do nothing;

-- 2026年8月オープニングキャンペーン
insert into public.campaigns (slug, title, starts_at, ends_at, is_active) values
  ('opening-2026-08', 'Watch Style Club オープニングキャンペーン',
   '2026-08-01 00:00:00+09', '2026-08-31 23:59:59+09', true)
on conflict (slug) do nothing;
