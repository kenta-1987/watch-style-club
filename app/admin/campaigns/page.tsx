import Link from "next/link";
import { listCampaigns } from "@/lib/campaign";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-black/50 hover:text-ink">
          ← レビュー
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-semibold">キャンペーン応募</h1>

      {campaigns.length === 0 ? (
        <p className="mt-10 text-sm text-black/40">キャンペーンがありません。</p>
      ) : (
        <div className="mt-6 space-y-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/admin/campaigns/${c.slug}`}
              className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[0.02]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{c.title}</p>
                  {c.is_active && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                      開催中
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-black/40">{c.slug}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold">{c.entry_count}</p>
                <p className="text-xs text-black/40">応募</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
