-- Watch Style Club — Shopify購入証明連携 Phase 0
-- Supabase Studio の SQL Editor で実行（0001〜0017 の後）。local=本番 同一プロジェクトのため1回で両反映。
--
-- ■ 思想（HANDOVER.md §16 参照）
--   WSCは将来 Shopify/Amazon/楽天/Yahoo/BASE/STORES 等を横断する「Style Commerce Platform」を目指す。
--   そのため今回の連携は「Shopify注文管理」ではなく「チャネル非依存の購入証明台帳」として設計する。
--
-- ■ 不変条件（変更しないこと）
--   - WSCが持つのは「この profile がこの sku_id を持っている」という事実のみ。
--     注文番号・住所・配送状況・決済状態・金額は一切保持しない。
--   - verified_purchases への書き込みは record_verified_purchase()（SECURITY DEFINER・service_role限定）
--     経由のみ。直接INSERTしない（0015 award_points() と同じ思想）。
--   - verification_tokens は purchase_claim 専用ではなく汎用（purpose列で分岐）。
--     将来 invitation / event_checkin 等を追加してもテーブルは増やさない。
--   - dedupe_key は「Webhook再送対策の内部キー」としてのみ存在する。
--     UI・管理画面・ログ表示のいずれにも出力しない。注文追跡に使わない。

-- ① 購入証明台帳（真実の源。事実のみ・PIIなし）
create table if not exists public.verified_purchases (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  sku_id              uuid not null references public.skus(id) on delete cascade,
  channel             text not null,                 -- 'shopify' | 将来 'amazon' | 'rakuten' | 'yahoo' | 'base' | 'stores' ...
  shop_domain         text,
  purchased_at        timestamptz not null,
  verified            boolean not null default true,
  verification_source text not null,                 -- 'shopify_webhook' | 'purchase_claim' ...
  dedupe_key          text unique,
  created_at          timestamptz not null default now()
);

create index if not exists verified_purchases_profile_idx on public.verified_purchases (profile_id);
create index if not exists verified_purchases_sku_idx on public.verified_purchases (sku_id);

-- ② 汎用トークン（purchase_claim 専用ではない。purpose列で分岐）
create table if not exists public.verification_tokens (
  id           uuid primary key default gen_random_uuid(),
  token        text unique not null,
  purpose      text not null,                        -- 'purchase_claim' | 将来 'invitation' | 'event_checkin' ...
  target_email text not null,
  payload      jsonb not null default '{}'::jsonb,
  dedupe_key   text,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  consumed_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- 同一注文からの再送で二重発行しないための部分unique（dedupe_keyがある行のみ）
create unique index if not exists verification_tokens_dedupe_idx
  on public.verification_tokens (dedupe_key) where dedupe_key is not null;

-- ===== RLS =====
alter table public.verified_purchases  enable row level security;
alter table public.verification_tokens enable row level security;

-- 購入証明: 本人 or admin が閲覧。書き込みポリシーは作らない（=record_verified_purchase() 経由のみ）。
drop policy if exists vp_select_own on public.verified_purchases;
create policy vp_select_own on public.verified_purchases for select
  using (auth.uid() = profile_id or public.is_admin());

-- トークン: PII（メールアドレス）を含むため公開readは一切なし。admin のみ全操作可。
drop policy if exists vt_admin_all on public.verification_tokens;
create policy vt_admin_all on public.verification_tokens for all
  using (public.is_admin()) with check (public.is_admin());

-- ===== 購入証明の記録（唯一の書き込み入口・冪等）=====
-- 直接 insert せず、必ずこの関数経由。service_role からのみ実行可。
create or replace function public.record_verified_purchase(
  p_profile_id          uuid,
  p_sku_id               uuid,
  p_channel              text,
  p_shop_domain          text,
  p_purchased_at         timestamptz,
  p_verification_source  text,
  p_dedupe_key           text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.verified_purchases
    (profile_id, sku_id, channel, shop_domain, purchased_at, verification_source, dedupe_key)
  values
    (p_profile_id, p_sku_id, p_channel, p_shop_domain, p_purchased_at, p_verification_source, p_dedupe_key)
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_verified_purchase(uuid,uuid,text,text,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.record_verified_purchase(uuid,uuid,text,text,timestamptz,text,text) to service_role;

-- ===== メールアドレス→プロフィール解決 =====
-- profiles に email 列は複製しない。auth.users を都度引く。service_role のみ実行可。
create or replace function public.match_user_by_email(p_email text)
returns uuid
language sql security definer stable set search_path = public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.match_user_by_email(text) from public, anon, authenticated;
grant execute on function public.match_user_by_email(text) to service_role;
