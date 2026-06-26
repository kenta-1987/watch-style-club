/**
 * Editor's Pick / 今週人気 などの将来セクション用プレースホルダー。
 * 投稿フィードの前に「枠」を用意しておく（中身は今後差し替え）。
 */
export function FeaturedRail({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-black/15 bg-white/40 p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {badge && (
          <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] text-black/45">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-black/45">{subtitle}</p>

      {/* 横スクロールのダミー枠 */}
      <div className="mt-3 flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 w-24 shrink-0 rounded-xl bg-black/[0.04]"
            aria-hidden
          />
        ))}
      </div>
    </section>
  );
}
