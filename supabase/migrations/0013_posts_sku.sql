-- Watch Style Club — SKU中心設計 ③ Style(posts) ↔ SKU
-- nullable FK。運営がレビュー時に紐付け、既存投稿も後から救済できる。非破壊。

alter table public.posts
  add column if not exists sku_id uuid references public.skus(id) on delete set null;
create index if not exists posts_sku_idx on public.posts (sku_id);
