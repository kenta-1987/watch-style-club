import Link from "next/link";
import type { PostAuthor } from "@/lib/posts";
import { avatarUrl } from "@/lib/avatar";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 投稿者ヘッダー：アバター・display_name・@username・投稿日。
 * username があればプロフィール /u/[username] へリンク。
 * 未設定（旧データ）でも fallbackName で壊れずに表示。
 */
export function AuthorHeader({
  author,
  fallbackName,
  createdAt,
  featured = false,
}: {
  author: PostAuthor;
  /** username/display_name 未設定時のフォールバック（posts.nickname） */
  fallbackName: string;
  createdAt: string;
  featured?: boolean;
}) {
  const name = author.displayName || fallbackName || "guest";
  const avatar = avatarUrl(author.avatarPath);
  const href = author.username ? `/u/${author.username}` : null;

  const identity = (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-sm font-semibold text-white">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="h-full w-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{name}</p>
          {featured && (
            <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">
              Editor&apos;s Pick
            </span>
          )}
        </div>
        {author.username && (
          <p className="truncate text-xs text-black/45">@{author.username}</p>
        )}
      </div>
    </div>
  );

  return (
    <header className="flex items-center justify-between px-4 py-3">
      {href ? (
        <Link href={href} className="min-w-0 hover:opacity-80">
          {identity}
        </Link>
      ) : (
        identity
      )}
      <time className="shrink-0 pl-2 text-xs text-black/40">{formatDate(createdAt)}</time>
    </header>
  );
}
