-- Watch Style Club v2.1 — Phase A ①
-- profiles を User First 化（すべて追加のみ・非破壊）。
-- username = 不変の公開ID（@kenta1987）、display_name = 自由変更可。

alter table public.profiles
  add column if not exists username       text,
  add column if not exists display_name   text,
  add column if not exists avatar_path    text,
  add column if not exists bio            text,
  add column if not exists favorite_watch text;

-- 既存行の backfill：display_name <- nickname
update public.profiles
set display_name = coalesce(display_name, nickname)
where display_name is null;

-- username の backfill：nickname を小文字英数_へ正規化（空なら 'user'）
update public.profiles
set username = lower(regexp_replace(coalesce(nullif(nickname, ''), 'user'), '[^a-zA-Z0-9_]', '', 'g'))
where username is null;

-- 3文字未満は末尾を補完、20文字超は切り詰め
update public.profiles set username = username || '_user' where char_length(username) < 3;
update public.profiles set username = left(username, 20)   where char_length(username) > 20;

-- 形式チェック（小文字英数_・3〜20）。既存backfillで規則外があっても落とさないよう NOT VALID。
-- 新規登録はアプリ側でも厳格に検証する。
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$') not valid;

-- 一意性（大文字小文字を無視）。
-- ※もし既存ユーザーが複数いて backfill で username が衝突した場合は、
--   このindex作成が失敗します。その時は重複行の username を手動で調整してください
--   （現状は実ユーザーがほぼ1名のため通常は衝突しません）。
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

comment on column public.profiles.username     is 'Immutable public handle (@name). lowercase a-z0-9_ , 3-20';
comment on column public.profiles.display_name is 'Freely editable display name';
comment on column public.profiles.avatar_path  is 'avatars bucket path';
