"use client";

import {
  approvePost,
  rejectPost,
  deletePost,
  featurePost,
  unfeaturePost,
} from "@/lib/actions/admin";
import type { PostStatus } from "@/lib/database.types";

type ReviewPost = {
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
  created_at: string;
};

export function ReviewCard({
  post,
  imageUrl,
}: {
  post: ReviewPost;
  imageUrl: string;
}) {
  const bandLine = [post.band_brand, post.band_name, post.color]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="aspect-square w-full bg-black/5">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="投稿画像" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-black/30">
            画像を読み込めません
          </div>
        )}
      </div>

      <div className="space-y-1 p-4 text-sm">
        <p className="font-medium">{post.nickname}</p>
        <p className="text-black/60">{post.watch_model}</p>
        {bandLine && <p className="text-black/60">{bandLine}</p>}
        {post.comment && (
          <p className="whitespace-pre-wrap pt-1 text-black/80">{post.comment}</p>
        )}
        {(post.product_url || post.product_handle) && (
          <p className="pt-1 text-xs text-black/40">
            商品：{post.product_url || `handle: ${post.product_handle}`}
          </p>
        )}
        <p className="pt-1 text-xs text-black/30">
          {new Date(post.created_at).toLocaleString("ja-JP")}
        </p>
      </div>

      {/* Editor's Pick（承認済みのみ） */}
      {post.status === "approved" && (
        <div className="flex items-center justify-between border-t border-black/10 px-4 py-2.5">
          <span className="text-xs text-black/50">
            {post.featured_at ? "★ Editor's Pick 中" : "Editor's Pick"}
          </span>
          {post.featured_at ? (
            <form action={unfeaturePost}>
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="submit"
                className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5"
              >
                Pick解除
              </button>
            </form>
          ) : (
            <form action={featurePost}>
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="submit"
                className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:opacity-80"
              >
                Pickする
              </button>
            </form>
          )}
        </div>
      )}

      <div className="flex gap-2 border-t border-black/10 p-3">
        {post.status !== "approved" && (
          <form action={approvePost} className="flex-1">
            <input type="hidden" name="postId" value={post.id} />
            <button
              type="submit"
              className="w-full rounded-full bg-ink py-2 text-xs font-medium text-white hover:opacity-80"
            >
              承認
            </button>
          </form>
        )}
        {post.status !== "rejected" && (
          <form action={rejectPost} className="flex-1">
            <input type="hidden" name="postId" value={post.id} />
            <button
              type="submit"
              className="w-full rounded-full border border-black/15 py-2 text-xs font-medium hover:bg-black/5"
            >
              非承認
            </button>
          </form>
        )}
        <form
          action={deletePost}
          onSubmit={(e) => {
            if (!confirm("この投稿を完全に削除します。よろしいですか？")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="imagePath" value={post.image_path} />
          <button
            type="submit"
            className="rounded-full px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50"
          >
            削除
          </button>
        </form>
      </div>
    </div>
  );
}
