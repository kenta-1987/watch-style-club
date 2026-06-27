import Link from "next/link";
import { getCatalogTree } from "@/lib/catalog";
import { createBrand, createSeries, createSku } from "@/lib/actions/catalog";

export const dynamic = "force-dynamic";

const inputClass =
  "rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-ink";
const addBtn =
  "rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-80";

export default async function SkusPage() {
  const tree = await getCatalogTree();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-black/50 hover:text-ink">
          ← レビュー
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-semibold">SKU / Face 管理</h1>
      <p className="mt-1 text-sm text-black/50">
        Brand → Series → SKU。SKU をクリックすると、おすすめ文字盤を管理できます。
      </p>

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

        {tree.map(({ brand, series }) => (
          <section key={brand.id} className="rounded-2xl border border-black/10 bg-white p-4">
            <h2 className="text-base font-semibold">{brand.name}</h2>

            {/* Series 追加 */}
            <form action={createSeries} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="brand_id" value={brand.id} />
              <input name="name" required placeholder="シリーズ名（例：FKM）" className={inputClass} />
              <button type="submit" className={addBtn}>
                シリーズ追加
              </button>
            </form>

            <div className="mt-4 space-y-4">
              {series.map(({ series: s, skus }) => (
                <div key={s.id} className="rounded-xl bg-black/[0.02] p-3">
                  <p className="text-sm font-medium">{s.name}</p>

                  <ul className="mt-2 flex flex-wrap gap-2">
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

                  {/* SKU 追加 */}
                  <form action={createSku} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="series_id" value={s.id} />
                    <input name="color_name" required placeholder="カラー（例：Black）" className={inputClass} />
                    <input name="color_hex" placeholder="#000000" className={`${inputClass} w-24`} />
                    <input name="shopify_product_handle" placeholder="shopify handle" className={inputClass} />
                    <input name="shopify_variant_id" placeholder="variant id" className={`${inputClass} w-28`} />
                    <button type="submit" className={addBtn}>
                      SKU追加
                    </button>
                  </form>
                </div>
              ))}
              {series.length === 0 && (
                <p className="text-xs text-black/40">シリーズがありません。</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
