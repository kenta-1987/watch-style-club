import type { PublicPost } from "@/lib/posts";
import { AuthorHeader } from "@/components/timeline/AuthorHeader";
import { LikeButton } from "@/components/timeline/LikeButton";
import { BookmarkButton } from "@/components/timeline/BookmarkButton";
import { AICoordinateButton } from "@/components/timeline/AICoordinateButton";
import { StyleSpec } from "@/components/style/StyleSpec";
import { ReproduceStyle } from "@/components/style/ReproduceStyle";

export function TimelineItem({
  post,
  imageUrl,
  liked,
  saved,
  isAuthed,
}: {
  post: PublicPost;
  imageUrl: string;
  liked: boolean;
  saved: boolean;
  isAuthed: boolean;
}) {
  const featured = !!post.featured_at;

  return (
    <article className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <AuthorHeader
        author={post.author}
        fallbackName={post.nickname}
        createdAt={post.created_at}
        featured={featured}
      />

      {/* Style の写真 */}
      <div className="aspect-[4/5] w-full bg-black/5">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${post.nickname} の Apple Watch Style`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-black/30">
            画像を読み込めません
          </div>
        )}
      </div>

      {/* アクションバー：いいね / 保存 */}
      <div className="flex items-center justify-between px-4 pt-3">
        <LikeButton
          postId={post.id}
          initialCount={post.like_count}
          initialLiked={liked}
          isAuthed={isAuthed}
        />
        <BookmarkButton postId={post.id} initialSaved={saved} isAuthed={isAuthed} />
      </div>

      {/* 本文：Style 仕様 → コメント → 再現 */}
      <div className="space-y-3 px-4 py-3">
        {post.comment && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-black/90">
            {post.comment}
          </p>
        )}

        {/* Style = Apple Watch × Band × Face */}
        <StyleSpec post={post} />

        {/* 🟢 このStyleを再現（①文字盤を追加 / ②このバンドを見る） */}
        <ReproduceStyle productUrl={post.product_url} />

        <AICoordinateButton />
      </div>
    </article>
  );
}
