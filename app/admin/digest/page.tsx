import Link from "next/link";
import { getDigest, type DigestItem } from "@/lib/digest";

export const dynamic = "force-dynamic";

function DigestSection({
  title,
  items,
  showRank,
}: {
  title: string;
  items: DigestItem[];
  showRank?: boolean;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">
        {title} <span className="text-black/40">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-black/40">対象なし</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((it, i) => (
            <div
              key={it.postId}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-2.5"
            >
              {showRank && (
                <span className="w-5 shrink-0 text-center text-sm font-semibold text-black/50">
                  {i + 1}
                </span>
              )}
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-black/5">
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {it.nickname}
                  {typeof it.score === "number" && (
                    <span className="ml-2 text-xs text-black/40">♡ {it.score}</span>
                  )}
                </p>
                <p className="truncate text-xs text-black/50">
                  {it.watchModel}
                  {it.brand ? ` / ${it.brand}` : ""}
                </p>
              </div>
              <Link
                href={`/p/${it.postId}`}
                className="shrink-0 text-xs text-black/40 hover:text-ink"
              >
                投稿 →
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function DigestPage() {
  const digest = await getDigest();

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-black/50 hover:text-ink">
          ← レビュー
        </Link>
      </div>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">週次ダイジェスト</h1>
          <p className="mt-1 text-sm text-black/50">
            Editor&apos;s Pick / 今週人気 / 新着 をメール配信用に出力します。
          </p>
        </div>
        <a
          href="/admin/digest/export"
          className="inline-flex w-fit items-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-80"
        >
          CSVをダウンロード
        </a>
      </div>

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        画像URLは7日間有効の署名URLです。メール配信はこのデータを元に Resend
        等へ接続予定（現状は手動エクスポート）。
      </p>

      <DigestSection title="Editor's Pick" items={digest.editorsPick} />
      <DigestSection title="今週人気" items={digest.weekly} showRank />
      <DigestSection title="新着" items={digest.recent} />
    </div>
  );
}
