-- Watch Style Club — Phase 5.1: Mission Engine（Welcome Mission）
-- Supabase Studio の SQL Editor で実行（0001〜0015 の後）。local=本番 同一プロジェクトのため1回で両反映。
--
-- ■ 思想
--   「Welcome Mission」は特別な機能ではなく、汎用 Mission Engine の最初の1グループ（mission_group='welcome'）。
--   将来 campaign（キャンペーン） / referral（友達紹介） / review（レビュー） / purchase（購入）等の
--   グループを「行を増やすだけ」で追加できる構造にする（コード変更不要）。
--
-- ■ Point Engine（0015）の完全再利用（重要 / 不変条件）
--   - ポイント付与は必ず award_points()（0015）経由。本マイグレーションは新しい付与経路を作らない。
--   - ミッション定義は point_rules.code と1対1で対応する（mission_definitions.code = point_rules.code）。
--     ポイント数は point_rules 側が真実の源 → /admin/points/rules の GUI でそのまま変更可能。
--   - 「1ユーザー1回」の重複防止は、既存の point_ledger 一意制約 (user_id, reason, source_type, source_id) を
--     再利用する。ミッション付与は必ず source_type='mission' / source_id=<userId 固定> で呼ぶこと
--     （post 単位ではなく user 単位で唯一にするため。lib/missions.ts の awardMission() 参照）。
--
-- ■ 達成状態は「導出」であり別テーブルで二重管理しない
--   ミッション達成済みかどうかは point_ledger に
--   (user_id, reason=mission.code, source_type='mission', source_id=userId) の行があるかで判定する。
--   進捗テーブル（mission_progress 等）は作らない＝ Ledger 中心設計（0015 の不変条件）を踏襲。
--
-- ■ カテゴリ非依存
--   mission_group / code は汎用文字列。Apple Watch 専用ではなく、将来アパレル/スニーカー/ガジェット等でも
--   同一エンジンを使う前提（0015 の Point Engine と同じ方針）。

-- ① ミッション定義（admin管理・グループ単位で拡張）
create table if not exists public.mission_definitions (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,        -- point_rules.code と対応（例: 'welcome_signup'）
  mission_group text not null,               -- 'welcome' | 'campaign' | 'referral' | 'review' | 'purchase' ...
  name          text not null,               -- UI表示名（例: '会員登録'）
  description   text,
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists mission_definitions_group_idx
  on public.mission_definitions (mission_group, sort_order);

alter table public.mission_definitions enable row level security;

-- 公開read（UIで「あと何ptで完了」を見せるため誰でも定義は見られる。個人の達成状況は point_ledger 側のRLSで保護）
drop policy if exists md_select_all on public.mission_definitions;
create policy md_select_all on public.mission_definitions for select using (true);

drop policy if exists md_write_admin on public.mission_definitions;
create policy md_write_admin on public.mission_definitions for all
  using (public.is_admin()) with check (public.is_admin());

-- ② Welcome Mission 用ルール（point_rules に追加。既存の profile_completed / style_approved とは別枠の
--    「初回オンボーディング特典」として加算される想定＝意図的に併存させる）
insert into public.point_rules (code, name, points, is_active, description) values
  ('welcome_signup',      '会員登録',           100, true, 'Welcome Mission：初回ログイン時に1回だけ付与'),
  ('welcome_profile',     'プロフィール完成',    100, true, 'Welcome Mission：username/表示名/お気に入り/bio 完成で初回のみ付与'),
  ('welcome_first_style', '初回Style投稿',      300, true, 'Welcome Mission：初めて投稿が承認されたときに1回だけ付与')
on conflict (code) do nothing;

-- ③ Welcome Mission 定義
insert into public.mission_definitions (code, mission_group, name, description, sort_order, is_active) values
  ('welcome_signup',      'welcome', '会員登録',        '初回ログインで完了',                 1, true),
  ('welcome_profile',     'welcome', 'プロフィール完成', 'username・表示名・お気に入り・bioを入力',  2, true),
  ('welcome_first_style', 'welcome', '初回Style投稿',   '投稿が承認されると完了',              3, true)
on conflict (code) do nothing;
