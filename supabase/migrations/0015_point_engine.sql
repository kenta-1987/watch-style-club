-- Watch Style Club — Phase 5A: Point Engine (Style Points)
-- Supabase Studio の SQL Editor で実行（0001〜0014 の後）。local=本番 同一プロジェクトのため1回で両反映。
--
-- ■ 思想
--   Style Points (SP) は「購入ポイント」ではなく「コミュニティ貢献ポイント」。
--   Style投稿 / Editor's Pick / プロフィール完成 などコミュニティ貢献で獲得する。
--
-- ■ Point と Score は別概念（重要 / 今回は Point のみ実装）
--   - Style Points (SP)  = 本マイグレーションで実装する貢献ポイント（獲得/消費の通貨）。
--   - Style Score        = 将来導入する「信用スコア」。SPから交換され、ランキング/おすすめユーザー/
--                          Editor's Pickアルゴリズム等に利用する別テーブル・別概念。今回は未実装。
--   → SP と Score を混同しないこと。Score 導入時は別 migration（point とは別テーブル）で行う。
--
-- ■ カテゴリ非依存（重要）
--   このエンジンは Apple Watch 専用ではない。reason / source_type は汎用文字列で、
--   将来 アパレル / スニーカー / ガジェット / フード でも同一エンジンを利用する。
--   将来の Shopify アプリの中核機能となる前提で、SKU/カテゴリに依存しない設計とする。
--
-- ■ 不変条件（変更しないこと）
--   - Ledger 中心設計（point_ledger が真実の源）。
--   - balance はキャッシュ（集計結果）であり、直接 update しない。
--   - 残高更新は award_points() のみが行う。
--   - 重複付与防止は (user_id, reason, source_type, source_id) の一意制約で担保。

-- ① 残高（1ユーザー1行・ledgerの集計キャッシュ）
create table if not exists public.point_accounts (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  balance          int  not null default 0,
  lifetime_earned  int  not null default 0,
  lifetime_spent   int  not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ② 元帳（不変・追記のみ。delta 正=獲得 / 負=消費）
create table if not exists public.point_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  delta       int  not null,
  reason      text not null,                -- point_rules.code に対応
  source_type text not null,                -- 'post' | 'profile' | 'ranking' | 'campaign' | 'manual' ...（カテゴリ非依存）
  source_id   text,                         -- post.id / user_id / '2026-W26' 等。手動付与は null 可
  campaign_id uuid references public.campaigns(id) on delete set null,  -- 分析用（夏/新商品/レビュー/BF 等）。NULL可
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- 重複付与防止: 同一(user,reason,source_type,source_id)は1回だけ。
-- ※ source_id が null の行(手動付与等)は NULL同士が非衝突=複数回許可（意図通り）。
create unique index if not exists point_ledger_dedupe_idx
  on public.point_ledger (user_id, reason, source_type, source_id);
create index if not exists point_ledger_user_created_idx
  on public.point_ledger (user_id, created_at desc);
create index if not exists point_ledger_campaign_idx
  on public.point_ledger (campaign_id) where campaign_id is not null;

-- ③ ルール（コード→付与pt。adminが /admin/points/rules でコードなしに調整）
create table if not exists public.point_rules (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  points      int  not null,
  is_active   boolean not null default true,
  description text,
  created_at  timestamptz not null default now()
);

-- 候補ルール seed。5B で自動付与するのは style_approved / editors_pick / profile_completed の3つ。
-- 他は将来 wire 用に seed のみ（is_active=false）。
insert into public.point_rules (code, name, points, is_active, description) values
  ('profile_completed',     'プロフィール完成',     100,  true,  'username/表示名/お気に入り/bio を満たした初回のみ'),
  ('style_approved',        'Style承認',           100,  true,  '投稿が承認されたとき（1投稿1回）'),
  ('editors_pick',          'Editor''s Pick',      300,  true,  '編集部にPickされたとき（1投稿1回）'),
  ('first_style',           '初投稿ボーナス',       200,  false, '初の承認Style（将来wire）'),
  ('campaign_entry',        'キャンペーン参加',     100,  false, 'キャンペーン応募（将来wire）'),
  ('weekly_ranking_top10',  '週間ランキングTOP10',  500,  false, '週次集計（将来wire）'),
  ('monthly_ranking_top10', '月間ランキングTOP10', 1000,  false, '月次集計（将来wire）')
on conflict (code) do nothing;

-- ===== RLS =====
alter table public.point_accounts enable row level security;
alter table public.point_ledger   enable row level security;
alter table public.point_rules     enable row level security;

-- 残高: 本人 or admin が閲覧。書き込みポリシーは作らない（=クライアントから書けない / award_points のみ）。
drop policy if exists pa_select_own on public.point_accounts;
create policy pa_select_own on public.point_accounts for select
  using (auth.uid() = user_id or public.is_admin());

-- 元帳: 本人 or admin が閲覧。書き込み不可。
drop policy if exists pl_select_own on public.point_ledger;
create policy pl_select_own on public.point_ledger for select
  using (auth.uid() = user_id or public.is_admin());

-- ルール: 公開read（UIで獲得方法を見せる）、書き込みは admin。
drop policy if exists pr_select_all on public.point_rules;
create policy pr_select_all on public.point_rules for select using (true);
drop policy if exists pr_write_admin on public.point_rules;
create policy pr_write_admin on public.point_rules for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== 付与関数（唯一の残高更新入口・冪等）=====
-- 直接 balance を update せず、必ずこの関数経由。service_role からのみ実行可。
create or replace function public.award_points(
  p_user_id     uuid,
  p_reason      text,
  p_source_type text,
  p_source_id   text  default null,
  p_metadata    jsonb default '{}'::jsonb,
  p_campaign_id uuid  default null
) returns table (awarded boolean, delta int, new_balance int)
language plpgsql security definer set search_path = public
as $$
declare v_points int; v_active boolean; v_ledger uuid;
begin
  select points, is_active into v_points, v_active
    from public.point_rules where code = p_reason;
  if v_points is null then raise exception 'unknown point rule: %', p_reason; end if;

  if not v_active then
    return query select false, 0,
      coalesce((select balance from public.point_accounts where user_id=p_user_id),0);
    return;
  end if;

  -- 重複付与は一意制約 + ON CONFLICT DO NOTHING で冪等に弾く
  insert into public.point_ledger (user_id, delta, reason, source_type, source_id, campaign_id, metadata)
  values (p_user_id, v_points, p_reason, p_source_type, p_source_id, p_campaign_id, coalesce(p_metadata,'{}'::jsonb))
  on conflict (user_id, reason, source_type, source_id) do nothing
  returning id into v_ledger;

  if v_ledger is null then          -- 付与済み = no-op
    return query select false, 0,
      coalesce((select balance from public.point_accounts where user_id=p_user_id),0);
    return;
  end if;

  insert into public.point_accounts (user_id, balance, lifetime_earned, lifetime_spent)
  values (p_user_id, v_points, greatest(v_points,0), greatest(-v_points,0))
  on conflict (user_id) do update set
    balance         = public.point_accounts.balance + v_points,
    lifetime_earned = public.point_accounts.lifetime_earned + greatest(v_points,0),
    lifetime_spent  = public.point_accounts.lifetime_spent  + greatest(-v_points,0),
    updated_at      = now();

  return query select true, v_points,
    (select balance from public.point_accounts where user_id=p_user_id);
end;
$$;

revoke all on function public.award_points(uuid,text,text,text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.award_points(uuid,text,text,text,jsonb,uuid) to service_role;

-- 公開プロフィール用の限定公開（balance / lifetime_earned のみ。lifetime_spent と元帳は非公開）
create or replace function public.public_points(p_user_id uuid)
returns table (balance int, lifetime_earned int)
language sql security definer stable set search_path = public
as $$
  select coalesce(pa.balance,0), coalesce(pa.lifetime_earned,0)
  from (select 1) _ left join public.point_accounts pa on pa.user_id = p_user_id;
$$;
grant execute on function public.public_points(uuid) to anon, authenticated, service_role;
