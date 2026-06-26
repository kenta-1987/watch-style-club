-- Watch Style Club v2.1 — Phase A ②
-- Collection（所有 Watch / Band / Face）。Style（posts）とは別。3テーブル構成。
-- 閲覧は公開（プロフィールに出すため）、書き込みは本人のみ。

-- 所有 Apple Watch
create table if not exists public.owned_watches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  model      text not null,           -- 例: Ultra 2
  color      text,                    -- 例: Black
  created_at timestamptz not null default now()
);
create index if not exists owned_watches_user_idx on public.owned_watches (user_id);

-- 所有 Band
create table if not exists public.owned_bands (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  brand      text,                    -- 例: Campagne Sélection
  name       text not null,           -- 例: Titanium Band
  color      text,
  created_at timestamptz not null default now()
);
create index if not exists owned_bands_user_idx on public.owned_bands (user_id);

-- 所有 Face（文字盤）。Apple共有リンク or 設定レシピ。
create table if not exists public.owned_faces (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,           -- 例: Modular Ultra
  share_url  text,                    -- Apple Watch 文字盤の共有リンク
  recipe     jsonb,                   -- コンプリケーション等の設定レシピ
  created_at timestamptz not null default now()
);
create index if not exists owned_faces_user_idx on public.owned_faces (user_id);

-- RLS：閲覧は全員、変更は本人のみ
do $$
declare t text;
begin
  foreach t in array array['owned_watches','owned_bands','owned_faces'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I_select_all on public.%I;', t, t);
    execute format('create policy %I_select_all on public.%I for select using (true);', t, t);
    execute format('drop policy if exists %I_modify_own on public.%I;', t, t);
    execute format('create policy %I_modify_own on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t, t);
  end loop;
end $$;
