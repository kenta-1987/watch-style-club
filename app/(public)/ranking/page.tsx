import Link from "next/link";
import { getRanking } from "@/lib/posts";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "week", label: "今週" },
  { key: "month", label: "今月" },
] as const;

export default async function RankingPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period: "week" | "month" =
    searchParams.period === "month" ? "month" : "week";

  const { posts, signedUrls } = await getRanking(period, 30);

  return (
    <div className="mx-auto max-w-xl">
      <header>
        <p className="text-xs tracking-widest text-black/40">RANKING</p>
        <h1 className="mt-0.5 text-2xl font-semibold">人気の着画</h1>
        <p className="mt-1 text-sm text-black/60">いいねの多い Apple Watch コーデ</p>
      </header>

      <div className="mt-5 flex gap-2 border-b border-black/10">
        {TABS.map((t) => {
          const active = t.key === period;
          return (
            <Link
              key={t.key}
              href={`/ranking?period=${t.key}`}
              className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                active
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-black/50 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {posts.length === 0 ? (
        <p className="mt-12 text-center text-sm text-black/50">
          {period === "week" ? "今週" : "今月"}はまだランキングがありません。
          着画にいいねしてみましょう。
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {posts.map((post, i) => (
            <li key={post.id}>
              <Link
                href={`/p/${post.id}`}
                className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 hover:bg-black/[0.02]"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    i < 3 ? "bg-ink text-white" : "bg-black/[0.06] text-black/60"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-black/5">
                  {signedUrls[post.image_path] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={signedUrls[post.image_path]}
                      alt={`${post.nickname} の着画`}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {post.author.displayName ?? post.nickname}
                  </p>
                  <p className="truncate text-xs text-black/50">{post.watch_model}</p>
                  {post.band_brand && (
                    <p className="truncate text-xs text-black/40">{post.band_brand}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">♡ {post.score}</p>
                  <p className="text-[11px] text-black/40">
                    {period === "week" ? "今週" : "今月"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
