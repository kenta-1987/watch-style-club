import type { PublicPost } from "@/lib/posts";

/**
 * EC導線の商品カード。商品URLがある投稿に表示する。
 * 価格・レビューは将来 Shopify 連携（Phase2）で実値に差し替える前提のプレースホルダー。
 */
export function ProductCard({ post }: { post: PublicPost }) {
  const brand = post.band_brand ?? "Apple Watch バンド";
  const name = post.band_name ?? "バンド";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3">
      {/* 商品サムネ枠（将来：商品画像）。今はバンドの頭文字 */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-black/[0.05] text-base font-semibold text-black/50">
        {brand.charAt(0)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-black/50">{brand}</p>
        <p className="truncate text-sm font-medium">{name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {/* レビューは将来実値。今はダミー */}
          <span className="text-xs text-amber-500" aria-hidden>
            ★★★★★
          </span>
          <span className="text-[11px] text-black/35">レビュー準備中</span>
        </div>
      </div>

      {post.product_url ? (
        <a
          href={post.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-medium text-white hover:opacity-80"
        >
          商品を見る →
        </a>
      ) : (
        <span className="shrink-0 rounded-full bg-black/[0.06] px-4 py-2 text-xs text-black/40">
          準備中
        </span>
      )}
    </div>
  );
}
