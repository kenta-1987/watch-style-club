import type { Collections } from "@/lib/profile-data";
import type { AppleWatchModel } from "@/lib/watches-shared";
import {
  addOwnedWatch,
  addOwnedBand,
  addOwnedFace,
  deleteOwned,
  setPrimaryWatch,
} from "@/lib/actions/profile";

const inputClass =
  "rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink";

function DeleteButton({ kind, id }: { kind: string; id: string }) {
  return (
    <form action={deleteOwned}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-red-500 hover:underline">
        削除
      </button>
    </form>
  );
}

function Item({ label, kind, id }: { label: string; kind: string; id: string }) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm">
      <span className="min-w-0 truncate">{label}</span>
      <DeleteButton kind={kind} id={id} />
    </li>
  );
}

export function CollectionManager({
  collections,
  watchModels = [],
}: {
  collections: Collections;
  /** My Watch 追加フォーム用のモデルマスタ（設定画面から渡す） */
  watchModels?: AppleWatchModel[];
}) {
  return (
    <div className="space-y-6">
      {/* My Watch（構造化・is_primary が投稿フォームの初期値になる） */}
      <section>
        <h3 className="text-sm font-semibold">My Watch</h3>
        <ul className="mt-2 space-y-1.5">
          {collections.watches.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">
                {w.nickname ??
                  [w.model.replace(/^Apple Watch\s*/, ""), w.case_color ?? w.color, w.case_size ? `${w.case_size}mm` : null]
                    .filter(Boolean)
                    .join(" ")}
                {w.is_primary && (
                  <span className="ml-2 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">
                    メイン
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {!w.is_primary && (
                  <form action={setPrimaryWatch}>
                    <input type="hidden" name="id" value={w.id} />
                    <button type="submit" className="text-xs text-black/45 hover:underline">
                      メインにする
                    </button>
                  </form>
                )}
                <DeleteButton kind="watch" id={w.id} />
              </span>
            </li>
          ))}
        </ul>
        {watchModels.length > 0 ? (
          <form action={addOwnedWatch} className="mt-2 flex flex-wrap gap-2">
            <select name="apple_watch_model_id" required className={inputClass} defaultValue="">
              <option value="" disabled>
                モデルを選択
              </option>
              {watchModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
            <input name="case_color" placeholder="ケースカラー（任意）" className={inputClass} />
            <input name="case_size" type="number" placeholder="サイズmm" className={`${inputClass} w-24`} />
            <input name="nickname" placeholder="ニックネーム（任意）" className={inputClass} />
            <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-80">
              追加
            </button>
          </form>
        ) : (
          <p className="mt-2 text-xs text-black/40">モデルマスタの読み込みに失敗しました。</p>
        )}
      </section>

      {/* Band */}
      <section>
        <h3 className="text-sm font-semibold">Owned Bands</h3>
        <ul className="mt-2 space-y-1.5">
          {collections.bands.map((b) => (
            <Item
              key={b.id}
              kind="band"
              id={b.id}
              label={[b.brand, b.name, b.color].filter(Boolean).join(" ")}
            />
          ))}
        </ul>
        <form action={addOwnedBand} className="mt-2 flex flex-wrap gap-2">
          <input name="brand" placeholder="ブランド" className={inputClass} />
          <input name="name" required placeholder="バンド名" className={inputClass} />
          <input name="color" placeholder="カラー" className={inputClass} />
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-80">
            追加
          </button>
        </form>
      </section>

      {/* Face */}
      <section>
        <h3 className="text-sm font-semibold">Owned Faces</h3>
        <ul className="mt-2 space-y-1.5">
          {collections.faces.map((f) => (
            <Item key={f.id} kind="face" id={f.id} label={f.name} />
          ))}
        </ul>
        <form action={addOwnedFace} className="mt-2 flex flex-wrap gap-2">
          <input name="name" required placeholder="文字盤名（例：Modular Ultra）" className={inputClass} />
          <input name="share_url" placeholder="共有リンク（任意）" className={inputClass} />
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-80">
            追加
          </button>
        </form>
      </section>
    </div>
  );
}
