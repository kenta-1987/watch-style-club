import Link from "next/link";
import { CoverMedia } from "@/components/media/CoverMedia";

/** ランキング/Editor's Pick の横スクロール用ミニカード（投稿詳細 /p/[id] へ） */
export function MiniCard({
  id,
  imageUrl,
  nickname,
  rank,
  metric,
  coverType = "image",
  coverDuration = null,
  mediaCount = 1,
}: {
  id: string;
  imageUrl: string;
  nickname: string;
  rank?: number;
  metric?: string;
  coverType?: "image" | "video";
  coverDuration?: number | null;
  mediaCount?: number;
}) {
  return (
    <Link href={`/p/${id}`} className="block w-28 shrink-0">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-black/5">
        <CoverMedia
          url={imageUrl}
          type={coverType}
          duration={coverDuration}
          count={mediaCount}
          alt={`${nickname} の Style`}
        />
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
