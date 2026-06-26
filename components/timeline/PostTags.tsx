import Link from "next/link";
import type { PublicPost } from "@/lib/posts";

/** モデルの短縮表示（タグ用） */
function shortModel(model: string): string {
  return model.replace(/^Apple Watch\s*/, "");
}

/**
 * ブランド/商品名/カラー/モデルのタグ表示。
 * ブランド・カラー・モデルはギャラリーの絞り込みに飛ぶ（将来はブランド公式ページへ差し替え可能）。
 */
export function PostTags({ post }: { post: PublicPost }) {
  const linkClass =
    "rounded-full bg-black/[0.05] px-2.5 py-1 text-xs text-black/70 hover:bg-black/[0.09]";
  const plainClass =
    "rounded-full bg-black/[0.05] px-2.5 py-1 text-xs text-black/70";

  return (
    <div className="flex flex-wrap gap-1.5">
      {post.band_brand && (
        // TODO: 将来はブランド公式ページ /brands/[slug] へ
        <Link
          href={`/gallery?brand=${encodeURIComponent(post.band_brand)}`}
          className={linkClass}
        >
          {post.band_brand}
        </Link>
      )}
      {post.band_name && <span className={plainClass}>{post.band_name}</span>}
      {post.color && (
        <Link
          href={`/gallery?color=${encodeURIComponent(post.color)}`}
          className={linkClass}
        >
          {post.color}
        </Link>
      )}
      <Link
        href={`/gallery?model=${encodeURIComponent(post.watch_model)}`}
        className={linkClass}
      >
        {shortModel(post.watch_model)}
      </Link>
    </div>
  );
}
