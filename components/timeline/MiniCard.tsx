import Link from "next/link";

/** ランキング/Editor's Pick の横スクロール用ミニカード（投稿詳細 /p/[id] へ） */
export function MiniCard({
  id,
  imageUrl,
  nickname,
  rank,
  metric,
}: {
  id: string;
  imageUrl: string;
  nickname: string;
  rank?: number;
  metric?: string;
}) {
  return (
    <Link href={`/p/${id}`} className="block w-28 shrink-0">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-black/5">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={`${nickname} の着画`} loading="lazy" className="h-full w-full object-cover" />
        ) : null}
        {typeof rank === "number" && (
          <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
            {rank}
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate text-xs font-medium">{nickname}</p>
      {metric && <p className="truncate text-[11px] text-black/45">{metric}</p>}
    </Link>
  );
}
