import { formatDuration } from "@/lib/format";

/**
 * カードのカバー表示（画像 or 動画）＋バッジ。
 * 親要素は `relative` かつアスペクト/overflow-hidden を指定すること。
 * 動画は自動再生せず先頭フレーム＋▶（時間）を表示。複数メディアは ▣ 枚数。
 */
export function CoverMedia({
  url,
  type,
  duration = null,
  count = 1,
  alt = "",
}: {
  url: string;
  type: "image" | "video";
  duration?: number | null;
  count?: number;
  alt?: string;
}) {
  return (
    <>
      {type === "video" ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={url}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : null}

      {type === "video" && (
        <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          ▶{duration != null ? ` ${formatDuration(duration)}` : ""}
        </span>
      )}
      {count > 1 && type !== "video" && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
          ▣ {count}
        </span>
      )}
    </>
  );
}
