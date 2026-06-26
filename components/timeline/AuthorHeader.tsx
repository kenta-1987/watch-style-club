function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 投稿者ヘッダー：アバター・ニックネーム・モデル・投稿日。
 * 将来 投稿数 / 獲得いいね / 所有Watch をここに足せるよう、stats スロットを用意（現状は所有モデルのみ）。
 */
export function AuthorHeader({
  nickname,
  watchModel,
  createdAt,
  featured = false,
}: {
  nickname: string;
  watchModel: string;
  createdAt: string;
  /** Editor's Pick（編集部キュレーション）。official=公式投稿者とは別概念 */
  featured?: boolean;
}) {
  return (
    <header className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
        {nickname.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {/* TODO: 将来は /u/[id] のプロフィールへリンク */}
          <p className="truncate text-sm font-medium">{nickname}</p>
          {featured && (
            <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">
              Editor&apos;s Pick
            </span>
          )}
        </div>
        {/* stats スロット（将来：投稿数・獲得いいね）。今は所有モデルを表示 */}
        <p className="truncate text-xs text-black/50">{watchModel}</p>
      </div>
      <time className="shrink-0 text-xs text-black/40">{formatDate(createdAt)}</time>
    </header>
  );
}
