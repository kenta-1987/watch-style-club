import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reasonLabel } from "@/lib/points";

export const dynamic = "force-dynamic";

type Ledger = {
  id: string;
  delta: number;
  reason: string;
  source_type: string;
  source_id: string | null;
  campaign_id: string | null;
  created_at: string;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminUserLedgerPage({
  params,
}: {
  params: { userId: string };
}) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("id", params.userId)
    .maybeSingle<{ id: string; username: string | null; display_name: string | null }>();
  if (!profile) notFound();

  const [{ data: account }, { data: ledger }] = await Promise.all([
    supabase
      .from("point_accounts")
      .select("balance, lifetime_earned, lifetime_spent")
      .eq("user_id", params.userId)
      .maybeSingle<{ balance: number; lifetime_earned: number; lifetime_spent: number }>(),
    supabase
      .from("point_ledger")
      .select("id, delta, reason, source_type, source_id, campaign_id, created_at")
      .eq("user_id", params.userId)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Ledger[]>(),
  ]);

  const name = profile.display_name || profile.username || profile.id.slice(0, 8);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/points" className="text-sm text-black/50 hover:text-ink">
          ← Style Points
        </Link>
        {profile.username && (
          <Link
            href={`/u/${profile.username}`}
            className="text-sm text-black/50 hover:text-ink"
          >
            プロフィール →
          </Link>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-semibold">{name}</h1>
      {profile.username && <p className="text-sm text-black/45">@{profile.username}</p>}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Card label="残高" value={account?.balance ?? 0} />
        <Card label="累計獲得" value={account?.lifetime_earned ?? 0} />
        <Card label="累計消費" value={account?.lifetime_spent ?? 0} />
      </div>

      <h2 className="mt-6 text-sm font-semibold">元帳（直近200件）</h2>
      <div className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 bg-black/[0.02] text-left text-xs text-black/50">
            <tr>
              <th className="px-4 py-2 font-medium">理由</th>
              <th className="px-4 py-2 font-medium">source</th>
              <th className="px-4 py-2 font-medium">日時</th>
              <th className="px-4 py-2 text-right font-medium">delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {(ledger ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-black/40">
                  履歴はありません。
                </td>
              </tr>
            )}
            {(ledger ?? []).map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5">{reasonLabel(e.reason)}</td>
                <td className="px-4 py-2.5 text-xs text-black/45">
                  {e.source_type}
                  {e.source_id ? `:${e.source_id.slice(0, 8)}` : ""}
                  {e.campaign_id ? " 🎯" : ""}
                </td>
                <td className="px-4 py-2.5 text-xs text-black/45">{fmt(e.created_at)}</td>
                <td
                  className={`px-4 py-2.5 text-right font-semibold tabular-nums ${
                    e.delta >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {e.delta >= 0 ? "+" : ""}
                  {e.delta.toLocaleString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-3 text-center">
      <p className="text-lg font-semibold tabular-nums">{value.toLocaleString("ja-JP")}</p>
      <p className="text-[11px] text-black/45">{label}</p>
    </div>
  );
}
