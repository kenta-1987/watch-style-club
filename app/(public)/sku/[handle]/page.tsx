import { notFound } from "next/navigation";
import { getProductPageByHandle } from "@/lib/catalog";
import { getApprovedPosts, type PublicPost } from "@/lib/posts";
import { StyleGrid } from "@/components/profile/StyleGrid";
import { shopUrlForHandle } from "@/lib/shopify";

export const dynamic = "force-dynamic";

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const n = Math.max(0, Math.min(5, rating));
  return (
    <span className="text-sm text-amber-500" aria-label={`★${n}`}>
      {"★".repeat(n)}
      <span className="text-black/15">{"★".repeat(5 - n)}</span>
    </span>
  );
}

/**
 * 商品ページ（URL は /sku/[handle] のまま互換維持・中身は Product ベース）。
 * 1 handle = 1 Product。配下の全カラー(SKU)・おすすめ文字盤・この商品のStyleを表示する。
 */
export default async function ProductPage({
  params,
}: {
  params: { handle: string };
}) {
  const page = await getProductPageByHandle(params.handle);
  if (!page) notFound();

  const { product, brandName, label, skus, faces } = page;

  // この商品の全SKUのStyleをまとめて表示
  const skuStyles = await Promise.all(
    skus.map((sku) => getApprovedPosts({ skuId: sku.id, limit: 60 }))
  );
  const styles: PublicPost[] = skuStyles.flatMap((s) => s.posts);
  const signedUrls = Object.assign({}, ...skuStyles.map((s) => s.signedUrls)) as Record<
    string,
    string
  >;

  const shopUrl =
    product.product_url ?? shopUrlForHandle(product.shopify_product_handle);
  const productImage =
    product.image_path && product.image_path.startsWith("http")
      ? product.image_path
      : null;
  const soldOut = product.sales_status === "sold_out";
  const discontinued = product.sales_status === "discontinued";

  return (
    <div className="mx-auto max-w-xl">
      {/* 商品ヘッダー（Productが正本） */}
      <header>
        <p className="text-xs tracking-widest text-black/40">
          {(brandName ?? "").toUpperCase()}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{label}</h1>
        {skus.length > 0 && (
          <p className="mt-1 text-sm text-black/55">
            カラー：{skus.map((s) => s.color_name).join(" / ")}
          </p>
        )}
        {(product.wsc_description || product.description) && (
          <p className="mt-3 text-sm leading-relaxed text-black/70">
            {product.wsc_description || product.description}
          </p>
        )}
      </header>

      {productImage && (
        <div className="mt-4 aspect-square w-full overflow-hidden rounded-2xl bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImage} alt={label} className="h-full w-full object-cover" />
        </div>
      )}

      {discontinued ? (
        <div className="mt-4 flex items-center justify-center rounded-full border border-black/10 py-3 text-sm font-medium text-black/40">
          販売終了
        </div>
      ) : soldOut ? (
        <div className="mt-4 flex items-center justify-center rounded-full border border-black/10 py-3 text-sm font-medium text-black/40">
          在庫なし
        </div>
      ) : shopUrl ? (
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-ink py-3 text-sm font-semibold text-white hover:opacity-80"
        >
          <span className="text-base leading-none">🛒</span>
          このバンドを見る（Shopify）
        </a>
      ) : null}

      {/* おすすめ文字盤 */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold">⭐ おすすめ文字盤</h2>
        {faces.length === 0 ? (
          <p className="mt-3 text-sm text-black/40">編集部が選定中です。</p>
        ) : (
          <div className="mt-3 space-y-3">
            {faces.map((f) => (
              <div key={f.id} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium">{f.name}</p>
                  <Stars rating={f.rating} />
                </div>
                {(f.category || f.watch_model) && (
                  <p className="mt-0.5 text-xs text-black/45">
                    {[f.category, f.watch_model].filter(Boolean).join(" / ")}
                  </p>
                )}
                {f.editor_comment && (
                  <p className="mt-2 text-sm leading-relaxed text-black/80">
                    {f.editor_comment}
                  </p>
                )}
                {f.apple_share_url ? (
                  <a
                    href={f.apple_share_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <span className="text-base leading-none">🟢</span>
                    この文字盤を追加
                  </a>
                ) : (
                  <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-black/10 py-2.5 text-sm font-medium text-black/35">
                    <span className="text-base leading-none">🟢</span>
                    この文字盤を追加
                    <span className="ml-1 text-xs">（準備中）</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* この商品のStyle */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold">この商品のStyle</h2>
        <div className="mt-3">
          <StyleGrid
            posts={styles}
            signedUrls={signedUrls}
            emptyText="まだこの商品のStyleはありません。"
            showAuthor
          />
        </div>
      </section>
    </div>
  );
}
