-- Watch Style Club v2.1 — Phase A ④
-- avatars バケット（公開読み取り。アバターは見せる前提で公開＝署名URL不要・実装簡単）。
-- アップロード/更新/削除は自分のフォルダ {user_id}/... のみ。

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_upload_own on storage.objects;
create policy avatars_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- public バケットなので閲覧ポリシーは不要（誰でも読み取り可）。
