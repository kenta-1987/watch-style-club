import Link from "next/link";
import type { PublicPost } from "@/lib/posts";

/** プロフィール用の Style サムネイルグリッド（Instagram的） */
export function StyleGrid({
  posts,
  signedUrls,
  emptyText = "まだStyleがありません。",
}: {
  posts: PublicPost[];
  signedUrls: Record<string, string>;
  emptyText?: string;
}) {
  if (posts.length === 0) {
    return <p className="py-10 text-center text-sm text-black/40">{emptyText}</p>;
  }
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {posts.map((p) => (
        <Link
          key={p.id}
          href={`/p/${p.id}`}
          className="relative aspect-square overflow-hidden rounded-lg bg-black/5"
        >
          {signedUrls[p.image_path] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrls[p.image_path]}
              alt={`${p.author.displayName ?? p.nickname} の Style`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : null}
          {p.featured_at && (
            <span className="absolute left-1 top-1 rounded-full bg-ink/90 px-1.5 py-0.5 text-[9px] font-medium text-white">
              Pick
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
