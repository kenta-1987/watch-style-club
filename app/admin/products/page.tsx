import Link from "next/link";
import { getCatalogTree, getCategories } from "@/lib/catalog";
import {
  createBrand,
  createProduct,
  createSku,
  toggleProductPublished,
  updateProduct,
} from "@/lib/actions/catalog";
import { SyncButton } from "@/components/admin/SyncButton";

export const dynamic = "force-dynamic";

const inputClass =
  "rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-ink";
const addBtn =
  "rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-80";

const SALES_STATUS_LABEL: Record<string, string> = {
  active: "販売中",
  sold_out: "在庫なし",
  discontinued: "販売終了",
};

export default async function ProductsAdminPage() {
  const [tree, categories] = await Promise.all([getCatalogTree(), getCategories()]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-black/50 hover:text-ink">
          ← レビュー
        </Link>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">商品カタログ管理</h1>
          <p className="mt-1 text-sm text-black/50">
            Brand → Product → SKU（カラー）。商品名をクリックすると詳細編集、SKUをクリックすると文字盤管理。
          </p>
        </div>
        <SyncButton />
      </div>

      {/* Brand 追加 */}
      <form action={createBrand} className="mt-5 flex flex-wrap gap-2">
        <input name="name" required placeholder="新しいブランド名" className={inputClass} />
        <button type="submit" className={addBtn}>
          ブランド追加
        </button>
      </form>

      <div className="mt-6 space-y-6">
        {tree.length === 0 && (
          <p className="text-sm text-black/40">まだブランドがありません。</p>
        )}

        {tree.map(({ brand, products }) => (
          <section key={brand.id} className="rounded-2xl border border-black/10 bg-white p-4">
            <h2 className="text-base font-semibold">{brand.name}</h2>

            {/* Product 追加 */}
            <form action={createProduct} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="brand_id" value={brand.id} />
              <input name="name" required placeholder="商品名（例：FKMバンド）" className={inputClass} />
              <select name="category_id" className={inputClass} defaultValue="">
                <option value="">カテゴリ未設定</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="submit" className={addBtn}>
                商品追加
              </button>
            </form>

            <div className="mt-4 space-y-4">
              {products.map(({ product, skus }) => (
                <details key={product.id} className="rounded-xl bg-black/[0.02] p-3">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{product.name}</span>
                    {product.is_recommended && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                        おすすめ
                      </span>
                    )}
                    {product.is_featured && (
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">
                        特集
                      </span>
                    )}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        product.sales_status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-black/10 text-black/50"
                      }`}
                    >
                      {SALES_STATUS_LABEL[product.sales_status]}
                    </span>
                    {product.source === "shopify" && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                        Shopify同期
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-2">
                      {product.shopify_product_handle && (
                        <Link
                          href={`/sku/${product.shopify_product_handle}`}
                          target="_blank"
                          className="text-[11px] text-black/40 hover:text-ink"
                          title="公開ページを開く"
                        >
                          公開↗
                        </Link>
                      )}
                      {/* 掲載ON/OFFトグル */}
                      <form action={toggleProductPublished}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="next" value={String(!product.is_published)} />
                        <button
                          type="submit"
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            product.is_published
                              ? "bg-ink text-white"
                              : "border border-black/20 text-black/50"
                          }`}
                        >
                          {product.is_published ? "掲載中" : "非掲載"}
                        </button>
                      </form>
                    </span>
                  </summary>

                  {/* Product 詳細編集 */}
                  <form action={updateProduct} className="mt-3 space-y-2 border-t border-black/5 pt-3">
                    <input type="hidden" name="id" value={product.id} />
                    <div className="flex flex-wrap gap-2">
                      <input
                        name="name"
                        defaultValue={product.name}
                        placeholder="商品名"
                        className={`${inputClass} flex-1`}
                      />
                      <select name="category_id" defaultValue={product.category_id ?? ""} className={inputClass}>
                        <option value="">カテゴリ未設定</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select name="sales_status" defaultValue={product.sales_status} className={inputClass}>
                        <option value="active">販売中</option>
                        <option value="sold_out">在庫なし</option>
                        <option value="discontinued">販売終了</option>
                      </select>
                      <input
                        name="sort_order"
                        type="number"
                        defaultValue={product.sort_order}
                        className={`${inputClass} w-20`}
                        title="表示順（小さいほど先頭）"
                      />
                    </div>
                    <textarea
                      name="description"
                      defaultValue={product.description ?? ""}
                      placeholder="商品説明（Shopify同期で上書きされる事実列）"
                      rows={2}
                      className={`${inputClass} w-full`}
                    />
                    <textarea
                      name="wsc_description"
                      defaultValue={product.wsc_description ?? ""}
                      placeholder="Style Commerce向け説明（WSC編集列・同期で上書きされない）"
                      rows={2}
                      className={`${inputClass} w-full`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <input
                        name="product_url"
                        defaultValue={product.product_url ?? ""}
                        placeholder="商品URL"
                        className={`${inputClass} flex-1`}
                      />
                      <input
                        name="image_path"
                        defaultValue={product.image_path ?? ""}
                        placeholder="商品画像URL"
                        className={`${inputClass} flex-1`}
                      />
                      <input
                        name="shopify_product_handle"
                        defaultValue={product.shopify_product_handle ?? ""}
                        placeholder="shopify handle"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" name="is_published" defaultChecked={product.is_published} />
                        掲載
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" name="is_recommended" defaultChecked={product.is_recommended} />
                        おすすめ
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" name="is_featured" defaultChecked={product.is_featured} />
                        特集
                      </label>
                      <button type="submit" className={addBtn}>
                        保存
                      </button>
                    </div>
                  </form>

                  {/* SKU（カラー）一覧・追加 */}
                  <div className="mt-3 border-t border-black/5 pt-3">
                    <ul className="flex flex-wrap gap-2">
                      {skus.map((sku) => (
                        <li key={sku.id}>
                          <Link
                            href={`/admin/skus/${sku.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs hover:bg-black/[0.03]"
                          >
                            {sku.color_hex && (
                              <span
                                className="h-3 w-3 rounded-full border border-black/10"
                                style={{ backgroundColor: sku.color_hex }}
                              />
                            )}
                            {sku.color_name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <form action={createSku} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="product_id" value={product.id} />
                      <input name="color_name" required placeholder="カラー（例：Black）" className={inputClass} />
                      <input name="color_hex" placeholder="#000000" className={`${inputClass} w-24`} />
                      <input name="shopify_variant_id" placeholder="variant id" className={`${inputClass} w-28`} />
                      <button type="submit" className={addBtn}>
                        カラー追加
                      </button>
                    </form>
                  </div>
                </details>
              ))}
              {products.length === 0 && (
                <p className="text-xs text-black/40">商品がありません。</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
