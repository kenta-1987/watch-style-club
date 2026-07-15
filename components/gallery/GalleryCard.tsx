import Link from "next/link";
import type { PostAuthor } from "@/lib/posts";
import { CoverMedia } from "@/components/media/CoverMedia";
import { ShareButton } from "@/components/share/ShareButton";
import { shopUrlForHandle } from "@/lib/shopify";

type GalleryCardPost = {
  id: string;
  nickname: string;
  watch_model: string;
  band_brand: string | null;
  band_name: string | null;
  color: string | null;
  comment: string | null;
  product_url: string | null;
  product_handle: string | null;
  skuHandle: string | null;
  skuBrandName: string | null;
  skuProductName: string | null;
  skuColorName: string | null;
  skuProductUrl: string | null;
  coverType: "image" | "video";
  coverDuration: number | null;
  mediaCount: number;
  author: PostAuthor;
  recommendedFace: { name: string } | null;
};

export function GalleryCard({
  post,
  imageUrl,
}: {
  post: GalleryCardPost;
  imageUrl: string;
}) {
  // BAND は Product Catalog（SKU→Product→Brand）から導出。無ければ自由入力（未登録バンド）
  const bandLine = [
    post.skuBrandName ?? post.band_brand,
    post.skuProductName ?? post.band_name,
    post.skuColorName ?? post.color,
  ]
    .filter(Boolean)
    .join(" / ");
  const shopUrl = post.skuProductUrl ?? shopUrlForHandle(post.skuHandle) ?? post.product_url;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="relative aspect-square w-full overflow-hidden bg-black/5">
        <CoverMedia
          url={imageUrl}
          type={post.coverType}
          duration={post.coverDuration}
          count={post.mediaCount}
          alt={`${post.author.displayName ?? post.nickname} の Style`}
        />
        <ShareButton
          post={post}
          imageUrl={imageUrl}
          className="absolute right-1.5 top-1.5 rounded-full bg-black/45 p-1.5 text-white hover:bg-black/60 hover:text-white"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 text-sm">
        {post.author.username ? (
          <Link
            href={`/u/${post.author.username}`}
            className="font-medium leading-tight hover:underline"
          >
            {post.author.displayName ?? post.nickname}
          </Link>
        ) : (
          <p className="font-medium leading-tight">
            {post.author.displayName ?? post.nickname}
          </p>
        )}
        <p className="text-xs text-black/50">{post.watch_model}</p>
        {bandLine &&
          (post.skuHandle ? (
            <Link href={`/sku/${post.skuHandle}`} className="text-xs text-black/50 hover:underline">
              {bandLine}
            </Link>
          ) : (
            <p className="text-xs text-black/50">{bandLine}</p>
          ))}
        {post.comment && (
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-black/80">
            {post.comment}
          </p>
        )}

        {shopUrl && (
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center justify-center rounded-full bg-ink px-3 py-2 text-xs font-medium text-white hover:opacity-80"
          >
            このバンドを見る →
          </a>
        )}
      </div>
    </div>
  );
}
