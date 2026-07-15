import Link from "next/link";
import type { PublicPost, MediaItem } from "@/lib/posts";
import { AuthorHeader } from "@/components/timeline/AuthorHeader";
import { LikeButton } from "@/components/timeline/LikeButton";
import { BookmarkButton } from "@/components/timeline/BookmarkButton";
import { StyleSpec } from "@/components/style/StyleSpec";
import { RecommendedFace } from "@/components/style/RecommendedFace";
import { CoverMedia } from "@/components/media/CoverMedia";
import { MediaCarousel } from "@/components/media/MediaCarousel";
import { shopUrlForHandle } from "@/lib/shopify";
import { ShareButton } from "@/components/share/ShareButton";

export function TimelineItem({
  post,
  imageUrl,
  liked,
  saved,
  isAuthed,
  media,
}: {
  post: PublicPost;
  imageUrl: string;
  liked: boolean;
  saved: boolean;
  isAuthed: boolean;
  /** 詳細ページ（/p/[id]）のみ：全メディアを渡すとカルーセル表示 */
  media?: MediaItem[];
}) {
  const featured = !!post.featured_at;
  const alt = `${post.author.displayName ?? post.nickname} の Apple Watch Style`;
  const shopUrl = shopUrlForHandle(post.skuHandle) ?? post.product_url;

  // フィード：カバー1枚。複数 or 動画なら /p/[id] へ誘導。
  const cover = (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-black/5">
      <CoverMedia
        url={imageUrl}
        type={post.coverType}
        duration={post.coverDuration}
        count={post.mediaCount}
        alt={alt}
      />
    </div>
  );
  const linkCover = post.mediaCount > 1 || post.coverType === "video";

  return (
    <article className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <AuthorHeader
        author={post.author}
        fallbackName={post.nickname}
        createdAt={post.created_at}
        featured={featured}
      />

      {/* メディア：詳細はカルーセル、フィードはカバー */}
      {media ? (
        <MediaCarousel media={media} alt={alt} />
      ) : linkCover ? (
        <Link href={`/p/${post.id}`} className="block">
          {cover}
        </Link>
      ) : (
        cover
      )}

      {/* アクションバー：いいね / 保存 / シェア */}
      <div className="flex items-center justify-between px-4 pt-3">
        <LikeButton
          postId={post.id}
          initialCount={post.like_count}
          initialLiked={liked}
          isAuthed={isAuthed}
        />
        <div className="flex items-center gap-3">
          <BookmarkButton postId={post.id} initialSaved={saved} isAuthed={isAuthed} />
          <ShareButton post={post} imageUrl={imageUrl} />
        </div>
      </div>

      {/* 本文：Style 仕様 → コメント → 再現 */}
      <div className="space-y-3 px-4 py-3">
        {post.comment && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-black/90">
            {post.comment}
          </p>
        )}

        {/* Style = Apple Watch × Band */}
        <StyleSpec post={post} />

        {/* ⭐ おすすめ文字盤 → 🟢 この文字盤を追加 */}
        <RecommendedFace post={post} />

        {/* 🛒 このバンドを見る（SKUがあれば自動生成、無ければ自由入力URL） */}
        {shopUrl && (
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-full bg-ink py-2.5 text-sm font-semibold text-white hover:opacity-80"
          >
            <span className="text-base leading-none">🛒</span>
            このバンドを見る
          </a>
        )}
      </div>
    </article>
  );
}
