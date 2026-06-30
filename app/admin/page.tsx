import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/storage";
import { getSkuOptions } from "@/lib/catalog";
import { ReviewCard } from "@/components/admin/ReviewCard";
import type { PostStatus } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type AdminPost = {
  id: string;
  image_path: string;
  nickname: string;
  watch_model: string;
  band_brand: string | null;
  band_name: string | null;
  color: string | null;
  comment: string | null;
  product_url: string | null;
  product_handle: string | null;
  status: PostStatus;
  featured_at: string | null;
  sku_id: string | null;
  created_at: string;
};

const TABS: { key: PostStatus; label: string }[] = [
  { key: "pending", label: "承認待ち" },
  { key: "approved", label: "承認済み" },
  { key: "rejected", label: "非承認" },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status: PostStatus =
    searchParams.status === "approved"
      ? "approved"
      : searchParams.status === "rejected"
        ? "rejected"
        : "pending";

  const supabase = createClient();
  const [{ data: posts }, skuOptions] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "id, image_path, nickname, watch_model, band_brand, band_name, color, comment, product_url, product_handle, status, featured_at, sku_id, created_at"
      )
      .eq("status", status)
      .order("created_at", { ascending: false })
      .returns<AdminPost[]>(),
    getSkuOptions(),
  ]);

  const list = posts ?? [];

  // メディア（複数・動画）をまとめて取得し署名URL化
  const { data: mediaRows } = await supabase
    .from("post_media")
    .select("post_id, media_type, storage_path, sort_order")
    .in("post_id", list.map((p) => p.id))
    .order("sort_order", { ascending: true })
    .returns<
      { post_id: string; media_type: "image" | "video"; storage_path: string; sort_order: number }[]
    >();

  const signedUrls = await getSignedUrls([
    ...list.map((p) => p.image_path),
    ...(mediaRows ?? []).map((m) => m.storage_path),
  ]);

  const mediaByPost = new Map<string, { type: "image" | "video"; url: string }[]>();
  for (const m of mediaRows ?? []) {
    const arr = mediaByPost.get(m.post_id) ?? [];
    arr.push({ type: m.media_type, url: signedUrls[m.storage_path] ?? "" });
    mediaByPost.set(m.post_id, arr);
  }
  // post_media が無い旧投稿は image_path を1枚として扱う
  function mediaFor(p: AdminPost) {
    return (
      mediaByPost.get(p.id) ?? [{ type: "image" as const, url: signedUrls[p.image_path] ?? "" }]
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">投稿レビュー</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/skus" className="text-sm text-black/50 hover:text-ink">
            SKU/Face →
          </Link>
          <Link href="/admin/digest" className="text-sm text-black/50 hover:text-ink">
            ダイジェスト →
          </Link>
          <Link
            href="/admin/campaigns"
            className="text-sm text-black/50 hover:text-ink"
          >
            キャンペーン応募 →
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-black/50">管理者専用</p>

      <div className="mt-5 flex gap-2 border-b border-black/10">
        {TABS.map((t) => {
          const active = t.key === status;
          return (
            <Link
              key={t.key}
              href={`/admin?status=${t.key}`}
              className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                active
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-black/50 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {list.length === 0 ? (
        <p className="mt-10 text-center text-sm text-black/40">
          {status === "pending"
            ? "承認待ちの投稿はありません。"
            : "該当する投稿はありません。"}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((post) => (
            <ReviewCard
              key={post.id}
              post={post}
              media={mediaFor(post)}
              skuOptions={skuOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
