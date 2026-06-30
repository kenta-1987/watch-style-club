import Link from "next/link";
import type { PostAuthor } from "@/lib/posts";
import { CoverMedia } from "@/components/media/CoverMedia";

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
  coverType: "image" | "video";
  coverDuration: number | null;
  mediaCount: number;
  author: PostAuthor;
};

export function GalleryCard({
  post,
  imageUrl,
}: {
  post: GalleryCardPost;
  imageUrl: string;
}) {
  const bandLine = [post.band_brand, post.band_name, post.color]
    .filter(Boolean)
    .join(" / ");

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

        {post.product_url && (
          <a
            href={post.product_url}
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
