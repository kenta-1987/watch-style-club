import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getApprovedPosts } from "@/lib/posts";
import { FilterBar } from "@/components/gallery/FilterBar";
import { GalleryCard } from "@/components/gallery/GalleryCard";

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: { model?: string; brand?: string; color?: string };
}) {
  const supabase = createClient();
  const { model, brand, color } = searchParams;

  // 承認済みのみ。RLS により匿名でも status='approved' は閲覧可能。
  const [{ posts: list, signedUrls }, { data: models }, { data: brands }, { data: colorRows }] =
    await Promise.all([
      getApprovedPosts({ model, brand, color }),
      supabase.from("watch_models").select("label").order("sort_order"),
      supabase.from("band_brands").select("label").order("sort_order"),
      supabase
        .from("posts")
        .select("color")
        .eq("status", "approved")
        .not("color", "is", null)
        .returns<{ color: string | null }[]>(),
    ]);

  const colors = Array.from(
    new Set((colorRows ?? []).map((r) => r.color).filter((c): c is string => !!c))
  ).sort();

  const hasFilter = !!(model || brand || color);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">みんなのStyle</h1>
          <p className="mt-1 text-sm text-black/60">
            Apple Watch の Style を探す（本体 × バンド × 文字盤）
          </p>
        </div>
        <Link
          href="/post/new"
          className="inline-flex w-fit items-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-80"
        >
          あなたの着画を投稿する
        </Link>
      </div>

      <div className="mt-5">
        <FilterBar
          models={(models ?? []).map((m) => m.label)}
          brands={(brands ?? []).map((b) => b.label)}
          colors={colors}
        />
      </div>

      {list.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-black/50">
            {hasFilter
              ? "条件に合う着画はまだありません。"
              : "まだ着画がありません。最初の投稿者になりましょう！"}
          </p>
          <Link
            href="/post/new"
            className="mt-4 inline-flex items-center rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5"
          >
            着画を投稿する
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {list.map((post) => (
            <GalleryCard
              key={post.id}
              post={post}
              imageUrl={signedUrls[post.image_path] ?? ""}
            />
          ))}
        </div>
      )}
    </div>
  );
}
