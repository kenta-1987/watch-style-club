-- Watch Style Club — Storage (S1)
-- 非公開バケット。承認済み画像はサーバーで署名URLを発行して配信する。

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', false)
on conflict (id) do nothing;

-- 自分のフォルダ（{user_id}/...）にのみアップロード可
drop policy if exists upload_own_folder on storage.objects;
create policy upload_own_folder on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 自分の画像は自分で参照・削除可（公開配信はサーバーの署名URL経由）
drop policy if exists read_own_image on storage.objects;
create policy read_own_image on storage.objects for select to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists delete_own_image on storage.objects;
create policy delete_own_image on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
