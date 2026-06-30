import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  updatePointRule,
  togglePointRule,
  createPointRule,
  deletePointRule,
} from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

type Rule = {
  id: string;
  code: string;
  name: string;
  points: number;
  is_active: boolean;
  description: string | null;
};

const inputClass =
  "rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-ink";

export default async function PointRulesPage() {
  const supabase = createClient();

  const [{ data: rules }, { data: usedRows }] = await Promise.all([
    supabase
      .from("point_rules")
      .select("id, code, name, points, is_active, description")
      .order("created_at", { ascending: true })
      .returns<Rule[]>(),
    // 元帳で既に使われている reason（削除可否の判定用）
    supabase.from("point_ledger").select("reason").returns<{ reason: string }[]>(),
  ]);

  const usedCodes = new Set((usedRows ?? []).map((r) => r.reason));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/points" className="text-sm text-black/50 hover:text-ink">
          ← Style Points
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-semibold">ポイントルール</h1>
      <p className="mt-1 text-sm text-black/50">
        コードを書かずに付与ポイント・ON/OFF・説明を変更できます。元帳で使用済みのルールは履歴整合のため削除不可（OFFにしてください）。
      </p>

      {/* 既存ルール */}
      <div className="mt-5 space-y-3">
        {(rules ?? []).map((r) => {
          const used = usedCodes.has(r.code);
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-black/10 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <code className="rounded bg-black/[0.05] px-1.5 py-0.5 text-xs text-black/60">
                    {r.code}
                  </code>
                  {used && (
                    <span className="ml-2 text-[11px] text-black/35">使用中</span>
                  )}
                </div>
                {/* ON/OFF 即時トグル */}
                <form action={togglePointRule}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="is_active" value={(!r.is_active).toString()} />
                  <button
                    type="submit"
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      r.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-black/[0.06] text-black/40"
                    }`}
                  >
                    {r.is_active ? "ON" : "OFF"}
                  </button>
                </form>
              </div>

              {/* 編集フォーム */}
              <form action={updatePointRule} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input
                  name="name"
                  defaultValue={r.name}
                  className={`${inputClass} w-40`}
                  placeholder="名称"
                />
                <input
                  name="points"
                  type="number"
                  defaultValue={r.points}
                  className={`${inputClass} w-24`}
                  placeholder="pt"
                />
                <input
                  name="description"
                  defaultValue={r.description ?? ""}
                  className={`${inputClass} min-w-[12rem] flex-1`}
                  placeholder="説明"
                />
                <label className="flex items-center gap-1 text-xs text-black/55">
                  <input type="checkbox" name="is_active" defaultChecked={r.is_active} />
                  有効
                </label>
                <button
                  type="submit"
                  className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-80"
                >
                  保存
                </button>
              </form>

              {!used && (
                <form action={deletePointRule} className="mt-2">
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:underline"
                  >
                    削除
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {/* 新規追加 */}
      <div className="mt-6 rounded-2xl border border-dashed border-black/15 bg-white p-4">
        <h2 className="text-sm font-semibold">新規ルール追加</h2>
        <form action={createPointRule} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            name="code"
            required
            className={`${inputClass} w-44`}
            placeholder="code（半角英小文字/数字/_）"
          />
          <input name="name" required className={`${inputClass} w-40`} placeholder="名称" />
          <input
            name="points"
            type="number"
            required
            defaultValue={100}
            className={`${inputClass} w-24`}
            placeholder="pt"
          />
          <input
            name="description"
            className={`${inputClass} min-w-[12rem] flex-1`}
            placeholder="説明（任意）"
          />
          <label className="flex items-center gap-1 text-xs text-black/55">
            <input type="checkbox" name="is_active" defaultChecked />
            有効
          </label>
          <button
            type="submit"
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:opacity-80"
          >
            追加
          </button>
        </form>
        <p className="mt-2 text-[11px] text-black/40">
          ※ 新コードを自動付与するにはコード側の wire が必要です（現状の自動付与は style_approved /
          editors_pick / profile_completed）。手動付与・将来のキャンペーン付与にも使えます。
        </p>
      </div>
    </div>
  );
}
