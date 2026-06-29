import { notFound } from "next/navigation";
import { getSkuPageByHandle } from "@/lib/catalog";
import { getApprovedPosts } from "@/lib/posts";
import { StyleGrid } from "@/components/profile/StyleGrid";

export const dynamic = "force-dynamic";

const SHOPIFY_BASE =
  process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN || "https://shop.applewatchjournal.net";

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

export default async function SkuPage({
  params,
}: {
  params: { handle: string };
}) {
  const page = await getSkuPageByHandle(params.handle);
  if (!page) notFound();

  const { sku, brandName, seriesName, label, faces } = page;
  const { posts: styles, signedUrls } = await getApprovedPosts({
    skuId: sku.id,
    limit: 60,
  });

  const shopUrl = sku.shopify_product_handle
    ? `${SHOPIFY_BASE}/products/${sku.shopify_product_handle}`
    : null;
  const productImage =
    sku.image_path && sku.image_path.startsWith("http") ? sku.image_path : null;

  return (
    <div className="mx-auto max-w-xl">
      {/* SKU ヘッダー */}
      <header>
        <p className="text-xs tracking-widest text-black/40">
          {[brandName, seriesName].filter(Boolean).join(" · ").toUpperCase()}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{label}</h1>
        <p className="mt-1 text-sm text-black/55">カラー：{sku.color_name}</p>
      </header>

      {productImage && (
        <div className="mt-4 aspect-square w-full overflow-hidden rounded-2xl bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImage} alt={label} className="h-full w-full object-cover" />
        </div>
      )}

      {shopUrl && (
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-ink py-3 text-sm font-semibold text-white hover:opacity-80"
        >
          <span className="text-base leading-none">🛒</span>
          このバンドを見る（Shopify）
        </a>
      )}

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

      {/* このSKUを使ったStyle */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold">このSKUを使ったStyle</h2>
        <div className="mt-3">
          <StyleGrid
            posts={styles}
            signedUrls={signedUrls}
            emptyText="まだこのSKUのStyleはありません。"
            showAuthor
          />
        </div>
      </section>
    </div>
  );
}
