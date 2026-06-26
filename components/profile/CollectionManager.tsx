import type { Collections } from "@/lib/profile-data";
import {
  addOwnedWatch,
  addOwnedBand,
  addOwnedFace,
  deleteOwned,
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

export function CollectionManager({ collections }: { collections: Collections }) {
  return (
    <div className="space-y-6">
      {/* Watch */}
      <section>
        <h3 className="text-sm font-semibold">Owned Watches</h3>
        <ul className="mt-2 space-y-1.5">
          {collections.watches.map((w) => (
            <Item
              key={w.id}
              kind="watch"
              id={w.id}
              label={[w.model, w.color].filter(Boolean).join(" ")}
            />
          ))}
        </ul>
        <form action={addOwnedWatch} className="mt-2 flex flex-wrap gap-2">
          <input name="model" required placeholder="モデル（例：Ultra 2）" className={inputClass} />
          <input name="color" placeholder="カラー（例：Black）" className={inputClass} />
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-80">
            追加
          </button>
        </form>
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
