-- Watch Style Club — Product Catalog 再設計 ④: 旧構造の整理
--
-- ⚠️⚠️⚠️ このファイルは 0019〜0021 と同時に実行しないこと ⚠️⚠️⚠️
--
-- 実行条件（すべて満たしてから）:
--   1. 0019〜0021 実行済み
--   2. products対応コードが本番（Vercel）にデプロイ済み
--   3. 本番でタイムライン・ギャラリー・投稿詳細・投稿フォーム・/sku/[handle]・
--      /admin/products の動作確認が完了している
--   4. _bak_series_20260715 / _bak_skus_20260715 の内容確認済み
--
-- 旧コード（series参照）が動いている間にこれを実行すると本番が壊れる。
-- local=本番同一Supabaseのため「migrationだけ先に実行」は不可。

-- ① 旧 series 参照の削除
alter table public.skus drop column if exists series_id;
drop table if exists public.series;

-- ② SKU行に重複保存されていた商品レベル属性の削除（products.shopify_product_handle に昇格済み）
drop index if exists skus_shopify_handle_idx;
alter table public.skus drop column if exists shopify_product_handle;

-- ③ 旧 Apple Watch マスタの削除（apple_watch_models に置換済み）
drop table if exists public.watch_models;

-- ④ バックアップテーブルの削除（内容確認済みなら）
-- drop table if exists public._bak_series_20260715;
-- drop table if exists public._bak_skus_20260715;
