import type { MediaItem } from "@/lib/posts";

/**
 * 詳細ページ（/p/[id]）のメディア表示。
 * 1枚なら単体、複数なら横スクロール・スナップのカルーセル。
 * 動画は <video controls>（自動再生なし）。
 */
export function MediaCarousel({ media, alt }: { media: MediaItem[]; alt: string }) {
  if (media.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-black/5 text-xs text-black/30">
        メディアがありません
      </div>
    );
  }

  if (media.length === 1) {
    return (
      <div className="overflow-hidden rounded-2xl bg-black/5">
        <MediaOne item={media[0]} alt={alt} />
      </div>
    );
  }

  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-2xl">
      {media.map((m, i) => (
        <div
          key={m.path}
          className="w-[85%] shrink-0 snap-center overflow-hidden rounded-xl bg-black/5"
        >
          <MediaOne item={m} alt={`${alt} ${i + 1}`} />
        </div>
      ))}
    </div>
  );
}

function MediaOne({ item, alt }: { item: MediaItem; alt: string }) {
  if (item.type === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={item.signedUrl}
        controls
        preload="metadata"
        playsInline
        className="aspect-[4/5] h-full w-full bg-black object-contain"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.signedUrl}
      alt={alt}
      className="aspect-[4/5] h-full w-full object-cover"
    />
  );
}
