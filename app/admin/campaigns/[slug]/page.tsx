import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignEntrants } from "@/lib/campaign";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "承認待ち",
  approved: "承認済み",
  rejected: "非承認",
  削除済み: "削除済み",
};

function fmt(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ja-JP");
}

export default async function CampaignEntrantsPage({
  params,
}: {
  params: { slug: string };
}) {
  const { campaign, rows } = await getCampaignEntrants(params.slug);
  if (!campaign) notFound();

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link
          href="/admin/campaigns"
          className="text-sm text-black/50 hover:text-ink"
        >
          ← キャンペーン一覧
        </Link>
      </div>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{campaign.title}</h1>
          <p className="mt-1 text-sm text-black/50">
            応募 {rows.length} 件 / {campaign.slug}
          </p>
        </div>
        <a
          href={`/admin/campaigns/${campaign.slug}/export`}
          className="inline-flex w-fit items-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-80"
        >
          CSVをダウンロード
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-black/40">まだ応募がありません。</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-black/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-black/[0.03] text-xs text-black/50">
              <tr>
                <th className="px-4 py-3 font-medium">投稿日</th>
                <th className="px-4 py-3 font-medium">ニックネーム</th>
                <th className="px-4 py-3 font-medium">メール</th>
                <th className="px-4 py-3 font-medium">Watchモデル</th>
                <th className="px-4 py-3 font-medium">ステータス</th>
                <th className="px-4 py-3 font-medium">商品情報</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-black/5">
                  <td className="whitespace-nowrap px-4 py-3 text-black/70">
                    {fmt(r.postCreatedAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.nickname}</td>
                  <td className="px-4 py-3 text-black/70">{r.email || "-"}</td>
                  <td className="px-4 py-3 text-black/70">{r.watchModel || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-black/[0.05] px-2 py-1 text-xs">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-black/50">
                    {r.productUrl || r.productHandle || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
