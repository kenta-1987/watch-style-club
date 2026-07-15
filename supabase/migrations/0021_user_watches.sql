-- Watch Style Club — Product Catalog 再設計 ③: My Watch
-- Supabase SQL Editor で 0020 の後に実行。
--
-- ■ 目的
--   owned_watches（自由文字列コレクション）を「My Watch」へ進化させる。
--   apple_watch_models への構造化参照 + is_primary（投稿フォームの初期値）を持つ。
--   新テーブルは作らない（owned_watches を進化させる方針・設計書⑤）。
--
-- ■ 後方互換
--   model / color の文字列列は残す（プロフィール表示互換・0022でも消さない）。
--   posts.user_watch_id は nullable。既存投稿は null のまま watch_model 文字列で表示。

-- ① owned_watches 構造化
alter table public.owned_watches
  add column if not exists apple_watch_model_id uuid references public.apple_watch_models(id) on delete set null,
  add column if not exists case_material        text,
  add column if not exists case_color           text,
  add column if not exists case_size            int,
  add column if not exists nickname             text,
  add column if not exists is_primary           boolean not null default false;

-- メインWatchはユーザーごとに1件
create unique index if not exists owned_watches_primary_uidx
  on public.owned_watches (user_id) where is_primary;

-- ② 既存行の backfill: model 文字列 → apple_watch_models
--    'Ultra 2' のような短縮表記にも 'Apple Watch ' プレフィックス補完でマッチを試みる
update public.owned_watches ow
set apple_watch_model_id = awm.id,
    case_color = coalesce(ow.case_color, ow.color)
from public.apple_watch_models awm
where ow.apple_watch_model_id is null
  and (awm.display_name = ow.model or awm.display_name = 'Apple Watch ' || ow.model);

-- ③ profiles.watch_model から My Watch を自動生成
--    （既にowned_watchesを持つユーザーには作らない。無いユーザーにはメインWatchとして1件作る）
insert into public.owned_watches (user_id, model, apple_watch_model_id, is_primary)
select p.id, p.watch_model, awm.id, true
from public.profiles p
left join public.apple_watch_models awm on awm.display_name = p.watch_model
where p.watch_model is not null
  and not exists (select 1 from public.owned_watches ow where ow.user_id = p.id);

-- ④ 既存owned_watches持ちでメイン未設定のユーザー: 最古の1件をメインに昇格
update public.owned_watches ow
set is_primary = true
where ow.id = (
  select ow2.id from public.owned_watches ow2
  where ow2.user_id = ow.user_id
  order by ow2.created_at asc limit 1
)
and not exists (
  select 1 from public.owned_watches ow3
  where ow3.user_id = ow.user_id and ow3.is_primary
);

-- ⑤ posts に My Watch 参照を追加（nullable・既存投稿は watch_model 文字列でフォールバック表示）
alter table public.posts
  add column if not exists user_watch_id uuid references public.owned_watches(id) on delete set null;
create index if not exists posts_user_watch_idx on public.posts (user_watch_id) where user_watch_id is not null;
