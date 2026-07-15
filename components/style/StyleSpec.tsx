import Link from "next/link";
import type { PublicPost } from "@/lib/posts";

function shortModel(model: string): string {
  return model.replace(/^Apple Watch\s*/, "");
}

/**
 * Style の構成要素を「仕様シート」風に提示する：Apple Watch / Band / Face。
 * Style = 本体 × バンド × 文字盤、という思想をカード上で明示する中核UI。
 *
 * BAND は Product Catalog から導出する（Style Commerce の核）：
 *   - SKU紐付け投稿 → skus → products → brands（skuBrandName / skuProductName / skuColorName）
 *   - 未登録バンド   → band_brand / band_name / color（自由入力）
 * 投稿に商品情報をコピーしないため、カタログ側の変更が常に全投稿へ反映される。
 */
export function StyleSpec({ post }: { post: PublicPost }) {
  // SKU由来（Product導出）を優先、無ければ自由入力
  const brand = post.skuBrandName ?? post.band_brand;
  const productName = post.skuProductName ?? post.band_name;
  const colorName = post.skuColorName ?? post.color;
  const bandParts = [brand, productName, colorName].filter(Boolean);

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
              {brand ? (
                <Link
                  href={`/gallery?brand=${encodeURIComponent(brand)}`}
                  className="hover:underline"
                >
                  {brand}
                </Link>
              ) : null}
              {productName ? ` ${productName}` : ""}
              {colorName ? ` / ${colorName}` : ""}
            </span>
          )}
        </dd>
      </div>
    </dl>
  );
}
