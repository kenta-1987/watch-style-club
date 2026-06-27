-- Watch Style Club — SKU中心設計 ② Face Recommendations
-- 1つのSKUに複数Faceを priority 順で登録。watch_model は任意スコープ（null=全機種）。
-- 投稿者は入力しない＝編集部が管理（Editor's Pick と同じ考え方）。

create table if not exists public.face_recommendations (
  id              uuid primary key default gen_random_uuid(),
  sku_id          uuid not null references public.skus(id) on delete cascade,
  watch_model     text,                       -- null=全機種 / 値=機種限定
  name            text not null,              -- 例: Modular Ultra
  category        text,                       -- 例: Outdoor
  apple_share_url text,                       -- 無ければ「準備中」
  editor_comment  text,
  rating          smallint,                   -- ★1-5
  priority        int not null default 0,     -- 並び順（大きいほど上位）
  is_published    boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists face_rec_sku_priority_idx
  on public.face_recommendations (sku_id, priority desc);

alter table public.face_recommendations enable row level security;

drop policy if exists face_rec_select on public.face_recommendations;
create policy face_rec_select on public.face_recommendations for select using (true);
drop policy if exists face_rec_write on public.face_recommendations;
create policy face_rec_write on public.face_recommendations for all
  using (public.is_admin()) with check (public.is_admin());
