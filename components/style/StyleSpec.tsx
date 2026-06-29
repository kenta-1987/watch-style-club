import Link from "next/link";
import type { PublicPost } from "@/lib/posts";

function shortModel(model: string): string {
  return model.replace(/^Apple Watch\s*/, "");
}

/**
 * Style の構成要素を「仕様シート」風に提示する：Apple Watch / Band / Face。
 * Style = 本体 × バンド × 文字盤、という思想をカード上で明示する中核UI。
 * 値はギャラリーの絞り込みに飛ぶ（将来はブランド/文字盤ページへ差し替え可能）。
 */
export function StyleSpec({
  post,
  faceLabel,
}: {
  post: PublicPost;
  /** 文字盤名/レシピ。未保存なら undefined（→「準備中」表示） */
  faceLabel?: string | null;
}) {
  const bandParts = [post.band_brand, post.band_name, post.color].filter(Boolean);

  const rowClass = "flex items-baseline gap-3 py-2";
  const labelClass =
    "w-20 shrink-0 text-[11px] font-medium tracking-wider text-black/40";
  const valueClass = "min-w-0 flex-1 text-sm text-black/90";

  return (
    <dl className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white px-3">
      <div className={rowClass}>
        <dt className={labelClass}>APPLE WATCH</dt>
        <dd className={valueClass}>
          <Link
            href={`/gallery?model=${encodeURIComponent(post.watch_model)}`}
            className="hover:underline"
          >
            {shortModel(post.watch_model)}
          </Link>
        </dd>
      </div>

      <div className={rowClass}>
        <dt className={labelClass}>BAND</dt>
        <dd className={valueClass}>
          {bandParts.length === 0 ? (
            <span className="text-black/30">—</span>
          ) : post.skuHandle ? (
            // SKU 紐付け済み → Product ページへ
            <Link href={`/sku/${post.skuHandle}`} className="hover:underline">
              {bandParts.join(" / ")}
            </Link>
          ) : (
            <span>
              {post.band_brand ? (
                <Link
                  href={`/gallery?brand=${encodeURIComponent(post.band_brand)}`}
                  className="hover:underline"
                >
                  {post.band_brand}
                </Link>
              ) : null}
              {post.band_name ? ` ${post.band_name}` : ""}
              {post.color ? ` / ${post.color}` : ""}
            </span>
          )}
        </dd>
      </div>
    </dl>
  );
}
