import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Account = {
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
};

export default async function AdminPointsPage() {
  const supabase = createClient();

  // admin は RLS（pa_select_own の is_admin 分岐）で全アカウントを閲覧可
  const { data: accounts } = await supabase
    .from("point_accounts")
    .select("user_id, balance, lifetime_earned, lifetime_spent")
    .order("balance", { ascending: false })
    .limit(500)
    .returns<Account[]>();

  const ids = (accounts ?? []).map((a) => a.user_id);
  const profileMap = new Map<string, { username: string | null; display_name: string | null }>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ids)
      .returns<{ id: string; username: string | null; display_name: string | null }[]>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { username: p.username, display_name: p.display_name });
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-black/50 hover:text-ink">
          ← レビュー
        </Link>
        <Link href="/admin/points/rules" className="text-sm text-black/50 hover:text-ink">
          ポイントルール →
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-semibold">Style Points</h1>
      <p className="mt-1 text-sm text-black/50">
        ユーザー別の保有ポイント。Style Points（貢献ポイント）は将来の Style Score（信用スコア）とは別概念です。
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 bg-black/[0.02] text-left text-xs text-black/50">
            <tr>
              <th className="px-4 py-2 font-medium">ユーザー</th>
              <th className="px-4 py-2 text-right font-medium">残高</th>
              <th className="px-4 py-2 text-right font-medium">累計獲得</th>
              <th className="px-4 py-2 text-right font-medium">累計消費</th>
              <th className="px-4 py-2 text-right font-medium">履歴</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {(accounts ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-black/40">
                  まだポイントを保有するユーザーはいません。
                </td>
              </tr>
            )}
            {(accounts ?? []).map((a) => {
              const p = profileMap.get(a.user_id);
              const name = p?.display_name || p?.username || a.user_id.slice(0, 8);
              return (
                <tr key={a.user_id} className="hover:bg-black/[0.015]">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{name}</p>
                    {p?.username && <p className="text-xs text-black/40">@{p.username}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    {a.balance.toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-black/60">
                    {a.lifetime_earned.toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-black/60">
                    {a.lifetime_spent.toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/admin/points/${a.user_id}`}
                      className="text-xs text-black/50 hover:text-ink"
                    >
                      明細 →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
