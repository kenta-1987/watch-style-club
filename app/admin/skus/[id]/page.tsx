import Link from "next/link";
import { notFound } from "next/navigation";
import { getSkuWithFaces } from "@/lib/catalog";
import { addFace, deleteFace } from "@/lib/actions/catalog";

export const dynamic = "force-dynamic";

const inputClass =
  "rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-ink";

export default async function SkuFacesPage({
  params,
}: {
  params: { id: string };
}) {
  const { sku, product, faces, label } = await getSkuWithFaces(params.id);
  if (!sku) notFound();

  const handle = product?.shopify_product_handle ?? null;

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/admin/products" className="text-sm text-black/50 hover:text-ink">
        ← 商品カタログ
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{label}</h1>
        {handle && (
          <Link
            href={`/sku/${handle}`}
            target="_blank"
            className="shrink-0 text-sm text-black/50 hover:text-ink"
          >
            公開ページ ↗
          </Link>
        )}
      </div>
      <p className="mt-1 text-xs text-black/45">
        {handle ? `Shopify: ${handle}` : "Shopify handle 未設定（商品側で設定）"}
      </p>

      {/* おすすめ文字盤一覧 */}
      <h2 className="mt-6 text-sm font-semibold">おすすめ文字盤（priority 降順）</h2>
      <div className="mt-3 space-y-2">
        {faces.length === 0 && (
          <p className="text-sm text-black/40">まだ登録がありません。</p>
        )}
        {faces.map((f) => (
          <div key={f.id} className="rounded-xl border border-black/10 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{f.name}</p>
                  {f.rating ? (
                    <span className="text-xs text-amber-500">{"★".repeat(f.rating)}</span>
                  ) : null}
                  <span className="text-[10px] text-black/35">priority {f.priority}</span>
                </div>
                {(f.category || f.watch_model) && (
                  <p className="text-xs text-black/45">
                    {[f.category, f.watch_model].filter(Boolean).join(" / ")}
                  </p>
                )}
                {f.editor_comment && (
                  <p className="mt-1 text-xs text-black/70">{f.editor_comment}</p>
                )}
                <p className="mt-1 text-[11px] text-black/40">
                  {f.apple_share_url ? "🟢 共有URLあり" : "準備中（URL未設定）"}
                </p>
              </div>
              <form action={deleteFace}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="sku_id" value={sku.id} />
                <button type="submit" className="text-xs text-red-500 hover:underline">
                  削除
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {/* 追加フォーム */}
      <h2 className="mt-8 text-sm font-semibold">文字盤を追加</h2>
      <form action={addFace} className="mt-3 space-y-2">
        <input type="hidden" name="sku_id" value={sku.id} />
        <input name="name" required placeholder="文字盤名（例：Modular Ultra）" className={`${inputClass} w-full`} />
        <div className="flex flex-wrap gap-2">
          <input name="category" placeholder="カテゴリ（例：Outdoor）" className={inputClass} />
          <input name="watch_model" placeholder="機種（空=全機種）" className={inputClass} />
        </div>
        <div className="flex flex-wrap gap-2">
          <input name="rating" type="number" min="1" max="5" placeholder="★1-5" className={`${inputClass} w-20`} />
          <input name="priority" type="number" placeholder="priority" className={`${inputClass} w-24`} />
        </div>
        <input name="apple_share_url" placeholder="Apple 共有URL（任意・準備中可）" className={`${inputClass} w-full`} />
        <textarea
          name="editor_comment"
          rows={2}
          placeholder="Editor's Comment（例：ブラックケースとの相性が…）"
          className={`${inputClass} w-full`}
        />
        <button
          type="submit"
          className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:opacity-80"
        >
          追加する
        </button>
      </form>
    </div>
  );
}
