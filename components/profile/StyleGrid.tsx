import Link from "next/link";
import type { PublicPost } from "@/lib/posts";
import { CoverMedia } from "@/components/media/CoverMedia";

/** プロフィール用の Style サムネイルグリッド（Instagram的） */
export function StyleGrid({
  posts,
  signedUrls,
  emptyText = "まだStyleがありません。",
  showAuthor = false,
}: {
  posts: PublicPost[];
  signedUrls: Record<string, string>;
  emptyText?: string;
  /** サムネ下に投稿者名を表示（SKUページ等） */
  showAuthor?: boolean;
}) {
  if (posts.length === 0) {
    return <p className="py-10 text-center text-sm text-black/40">{emptyText}</p>;
  }
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {posts.map((p) => {
        const name = p.author.displayName ?? p.nickname;
        return (
          <Link key={p.id} href={`/p/${p.id}`} className="block">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-black/5">
              <CoverMedia
                url={signedUrls[p.image_path] ?? ""}
                type={p.coverType}
                duration={p.coverDuration}
                count={p.mediaCount}
                alt={`${name} の Style`}
              />
              {p.featured_at && (
                <span className="absolute left-1 top-1 rounded-full bg-ink/90 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  Pick
                </span>
              )}
            </div>
            {showAuthor && (
              <p className="mt-1 truncate text-[11px] text-black/55">
                {p.author.username ? `@${p.author.username}` : name}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
