-- Watch Style Club — RLS / functions / triggers (S1)

-- admin 判定ヘルパー
create or replace function public.is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 新規ユーザー登録時に profiles を自動生成
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, marketing_opt_in)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nickname', ''), 'guest'),
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- いいねトグル（原子的・二重いいね防止）。フェーズ2で使用。
create or replace function public.toggle_like(p_post_id uuid)
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count int;
begin
  if v_user is null then raise exception 'auth required'; end if;

  if exists (select 1 from public.post_likes where post_id = p_post_id and user_id = v_user) then
    delete from public.post_likes where post_id = p_post_id and user_id = v_user;
    update public.posts set like_count = greatest(like_count - 1, 0)
      where id = p_post_id returning like_count into v_count;
  else
    insert into public.post_likes (post_id, user_id) values (p_post_id, v_user);
    update public.posts set like_count = like_count + 1
      where id = p_post_id returning like_count into v_count;
  end if;
  return v_count;
end;
$$;

-- ===== RLS =====
alter table public.profiles         enable row level security;
alter table public.posts            enable row level security;
alter table public.post_likes       enable row level security;
alter table public.campaign_entries enable row level security;
alter table public.campaigns        enable row level security;
alter table public.watch_models     enable row level security;
alter table public.band_brands      enable row level security;

-- profiles
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles for select using (true);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);

-- posts
drop policy if exists posts_select_public on public.posts;
create policy posts_select_public on public.posts for select
  using (status = 'approved' or auth.uid() = user_id or public.is_admin());
drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts for insert
  with check (auth.uid() = user_id and status = 'pending');
drop policy if exists posts_update_admin on public.posts;
create policy posts_update_admin on public.posts for update using (public.is_admin());
drop policy if exists posts_delete_admin_or_own on public.posts;
create policy posts_delete_admin_or_own on public.posts for delete
  using (public.is_admin() or auth.uid() = user_id);

-- post_likes
drop policy if exists likes_select_all on public.post_likes;
create policy likes_select_all on public.post_likes for select using (true);
drop policy if exists likes_modify_own on public.post_likes;
create policy likes_modify_own on public.post_likes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- campaigns（公開読み取り、書き込みは admin）
drop policy if exists campaigns_select_all on public.campaigns;
create policy campaigns_select_all on public.campaigns for select using (true);
drop policy if exists campaigns_write_admin on public.campaigns;
create policy campaigns_write_admin on public.campaigns for all
  using (public.is_admin()) with check (public.is_admin());

-- campaign_entries（本人 or admin が閲覧、本人が応募）
drop policy if exists entries_select_own_admin on public.campaign_entries;
create policy entries_select_own_admin on public.campaign_entries for select
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists entries_insert_own on public.campaign_entries;
create policy entries_insert_own on public.campaign_entries for insert
  with check (auth.uid() = user_id);

-- masters（公開読み取り、書き込み admin）
drop policy if exists watch_models_select on public.watch_models;
create policy watch_models_select on public.watch_models for select using (true);
drop policy if exists watch_models_write on public.watch_models;
create policy watch_models_write on public.watch_models for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists band_brands_select on public.band_brands;
create policy band_brands_select on public.band_brands for select using (true);
drop policy if exists band_brands_write on public.band_brands;
create policy band_brands_write on public.band_brands for all
  using (public.is_admin()) with check (public.is_admin());
